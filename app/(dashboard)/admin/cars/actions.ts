'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { Car } from '@/lib/types/models';

export async function updateCar(carId: number, updates: Partial<Car>) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    const { error } = await supabase
      .from('cars')
      .update(updates)
      .eq('id', carId);

    if (error) {
      console.error('Error updating car:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/admin/cars');
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred';
    console.error('Unexpected error in updateCar:', err);
    return { success: false, error: message };
  }
}

export async function archiveCar(carId: number) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    const { error } = await supabase
      .from('cars')
      .update({ is_archived: true })
      .eq('id', carId);

    if (error) {
      console.error('Error archiving car:', error);
      if (error.message?.includes('is_archived')) {
        return { success: false, error: 'Database column is_archived does not exist. Please run the SQL migration (supabase/migrations/001_schema_overhaul.sql) in your Supabase SQL Editor.' };
      }
      return { success: false, error: error.message };
    }

    revalidatePath('/admin/cars');
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred';
    console.error('Unexpected error in archiveCar:', err);
    return { success: false, error: message };
  }
}

export async function unarchiveCar(carId: number) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    const { error } = await supabase
      .from('cars')
      .update({ is_archived: false })
      .eq('id', carId);

    if (error) {
      console.error('Error unarchiving car:', error);
      if (error.message?.includes('is_archived')) {
        return { success: false, error: 'Database column is_archived does not exist. Please run the SQL migration (supabase/migrations/001_schema_overhaul.sql) in your Supabase SQL Editor.' };
      }
      return { success: false, error: error.message };
    }

    revalidatePath('/admin/cars');
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred';
    console.error('Unexpected error in unarchiveCar:', err);
    return { success: false, error: message };
  }
}

export async function deleteCar(carId: number) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    const { data: car, error: fetchError } = await supabase
      .from('cars')
      .select('img_urls')
      .eq('id', carId)
      .single();

    if (fetchError) {
      console.error('Error fetching car to delete:', fetchError);
      return { success: false, error: fetchError.message };
    }

    if (car && car.img_urls && car.img_urls.length > 0) {
      try {
        const filePaths = car.img_urls.map((url: string) => {
          if (url.includes('/storage/v1/object/public/cars/')) {
            return url.split('/storage/v1/object/public/cars/')[1];
          }
          return url;
        });
        
        const { error: storageError } = await supabase
          .storage
          .from('cars')
          .remove(filePaths);
          
        if (storageError) {
          console.error('Error deleting car images:', storageError);
        }
      } catch (e) {
        console.error('Failed to parse and delete images:', e);
      }
    }

    const { error } = await supabase
      .from('cars')
      .delete()
      .eq('id', carId);

    if (error) {
      console.error('Error deleting car:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/admin/cars');
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred';
    console.error('Unexpected error in deleteCar:', err);
    return { success: false, error: message };
  }
}

export async function getCarById(carId: number) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { car: null, error: 'Unauthorized' };
    }

    const { data, error } = await supabase
      .from('cars')
      .select(`
        *,
        car_types (
          id,
          type
        )
      `)
      .eq('id', carId)
      .single();

    if (error) {
      console.error('Error fetching car:', error);
      return { car: null, error: error.message };
    }

    return { car: data as unknown as Car, error: undefined };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred';
    console.error('Unexpected error in getCarById:', err);
    return { car: null, error: message };
  }
}
