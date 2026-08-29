'use client'
import {createClient} from "@/lib/supabase/client";
import {FormEvent, useState} from "react";
import {toast} from "react-toastify";
import {FilePond, registerPlugin} from 'react-filepond';
import {FilePondFile} from "filepond";
import FilePondPluginImagePreview from 'filepond-plugin-image-preview';
import FilePondPluginFileValidateType from 'filepond-plugin-file-validate-type';
import 'filepond-plugin-image-preview/dist/filepond-plugin-image-preview.css';
import {useRouter} from "next/navigation";
import {FormSubmitButton} from "@/app/components/FormSubmitButton";
import 'filepond/dist/filepond.min.css';

registerPlugin(FilePondPluginImagePreview);
registerPlugin(FilePondPluginFileValidateType);

export default function UploadNewCarImagesPageContent({car_id}: {  car_id: string})
{
    const supabase = createClient();
    const [isPending, setIsPending] = useState(false)
    const [images, setImages] = useState<FilePondFile[]>([]);
    const router = useRouter();

    const uploadImages = async () =>
    {
        const imageUrls = [];

        for (const file of images)
        {
            // Clean file name to prevent special character issues in S3/Supabase storage URLs
            const cleanFileName = file.file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
            const fileName = `${Math.random().toString(36).slice(2)}_${cleanFileName}`;

            const {error} = await supabase
                .storage
                .from("cars")
                .upload(fileName, file.file, {
                    upsert: true,
                    cacheControl: '3600'
                });

            if (error)
            {
                const errMsg = error.message || (error as { error?: string })?.error || 'Storage upload error';
                console.error("Error uploading file:", errMsg, error);
                if (errMsg.toLowerCase().includes('row-level security') || errMsg.toLowerCase().includes('rls') || errMsg.toLowerCase().includes('violates')) {
                    toast.error("Storage RLS policy restriction. Please run the Storage RLS SQL policy script in Supabase SQL Editor.");
                } else if (errMsg.toLowerCase().includes('bucket not found') || errMsg.toLowerCase().includes('not found')) {
                    toast.error("Storage bucket 'cars' not found. Please create a Public bucket named 'cars' in Supabase Dashboard > Storage.");
                } else {
                    toast.error(`Image upload failed: ${errMsg}`);
                }
                return [];
            }

            // Get the public URL for this newly added image.
            const {data: {publicUrl}} = supabase
                .storage
                .from("cars")
                .getPublicUrl(fileName);

            imageUrls.push(publicUrl);
        }

        return imageUrls;
    };

    async function handleSubmit(e: FormEvent<HTMLFormElement>)
    {
        e.preventDefault();
        setIsPending(true);

        if (images.length <= 0)
        {
            toast.error("Please upload at least one image of your car.");
            setIsPending(false);
            return;
        }

        const imageUrls = await uploadImages();

        if (imageUrls.length <= 0)
        {
            setIsPending(false);
            return;
        }

        // Update the newly created car images url column.
        const {error} = await supabase
            .from('cars')
            .update({img_urls: imageUrls})
            .eq('id', car_id);

        if (error)
            toast.error(error.message);
        else
        {
            toast.success("Car added successfully.");
            router.replace('/admin/cars/');
        }

        setIsPending(false);
    }

    return (
        <div className='flex flex-col justify-center items-center py-10 px-4 md:px-8 lg:px-14'>
            <form onSubmit={handleSubmit} className='flex flex-col gap-4 w-full max-w-xl'>

                <ul className="steps">
                    <li className="step step-primary">Details</li>
                    <li className="step step-primary">Images</li>
                    <li className="step">Done!</li>
                </ul>

                <FilePond acceptedFileTypes={['image/*']} onupdatefiles={setImages} instantUpload={false}
                          allowMultiple={true} maxFiles={3} disabled={isPending} className='mt-12'
                          labelIdle={'Drag & Drop your car images or <span class="filepond--label-action"> Browse </span>'}/>
                <FormSubmitButton text='Upload' isPending={isPending}/>
            </form>
        </div>
    );
}