interface TextBoxProps
{
    id: string,
    type: string,
    label: string,
    placeholder: string,
    defaultValue?: string
}

export default function TextBox({id, type, label, placeholder, defaultValue = ''}: TextBoxProps)
{
    return (
        <div className='flex flex-col gap-1'>
            <label htmlFor={id}>{label}</label>
            <input
                required
                className='input input-bordered'
                defaultValue={defaultValue}
                type={type}
                autoComplete='on'
                id={id}
                name={id}
                placeholder={placeholder}/>
        </div>
    );
}