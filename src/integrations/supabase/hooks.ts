import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from './client';
import { Tables, TablesInsert, TablesUpdate } from './types';

// Products hooks
export const useProducts = () => {
  console.log("111111111111");
  return useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });
};

export const useProduct = (id: string) => {
  return useQuery({
    queryKey: ['products', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
};

export const useCreateProduct = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (product: TablesInsert<'products'>) => {
      const { data, error } = await supabase
        .from('products')
        .insert(product)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
};

// Formulas hooks
export const useFormulas = (productId?: string) => {
  return useQuery({
    queryKey: ['formulas', productId],
    queryFn: async () => {
      let query = supabase.from('formulas').select('*');
      
      if (productId) {
        query = query.eq('product_id', productId);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });
};

export const useCreateFormula = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (formula: TablesInsert<'formulas'>) => {
      const { data, error } = await supabase
        .from('formulas')
        .insert(formula)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['formulas'] });
      queryClient.invalidateQueries({ queryKey: ['formulas', data.product_id] });
    },
  });
};

// Packaging Options hooks
export const usePackagingOptions = (productId?: string) => {
  return useQuery({
    queryKey: ['packaging_options', productId],
    queryFn: async () => {
      let query = supabase.from('packaging_options').select('*');
      
      if (productId) {
        query = query.eq('product_id', productId);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });
};

export const useCreatePackagingOption = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (option: TablesInsert<'packaging_options'>) => {
      const { data, error } = await supabase
        .from('packaging_options')
        .insert(option)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['packaging_options'] });
      queryClient.invalidateQueries({ queryKey: ['packaging_options', data.product_id] });
    },
  });
};

// Label Tiers hooks
export const useLabelTiers = (productId?: string) => {
  return useQuery({
    queryKey: ['label_tiers', productId],
    queryFn: async () => {
      let query = supabase.from('label_tiers').select('*');
      
      if (productId) {
        query = query.eq('product_id', productId);
      }
      
      const { data, error } = await query.order('min_quantity', { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });
};

export const useCreateLabelTier = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (tier: TablesInsert<'label_tiers'>) => {
      const { data, error } = await supabase
        .from('label_tiers')
        .insert(tier)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['label_tiers'] });
      queryClient.invalidateQueries({ queryKey: ['label_tiers', data.product_id] });
    },
  });
};

// Manufacturing Tiers hooks
export const useManufacturingTiers = (productId?: string) => {
  return useQuery({
    queryKey: ['manufacturing_tiers', productId],
    queryFn: async () => {
      let query = supabase.from('manufacturing_tiers').select('*');
      
      if (productId) {
        query = query.eq('product_id', productId);
      }
      
      const { data, error } = await query.order('min_quantity', { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });
};

export const useCreateManufacturingTier = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (tier: TablesInsert<'manufacturing_tiers'>) => {
      const { data, error } = await supabase
        .from('manufacturing_tiers')
        .insert(tier)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['manufacturing_tiers'] });
      queryClient.invalidateQueries({ queryKey: ['manufacturing_tiers', data.product_id] });
    },
  });
};

// Quotes hooks
export const useQuotes = () => {
  return useQuery({
    queryKey: ['quotes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quotes')
        .select(`
          *,
          products (
            name,
            size_oz
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });
};

export const useCreateQuote = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (quote: TablesInsert<'quotes'>) => {
      const { data, error } = await supabase
        .from('quotes')
        .insert(quote)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
    },
  });
};

// Product with all related data
export const useProductWithDetails = (productId: string) => {
  return useQuery({
    queryKey: ['product-details', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          formulas (*),
          packaging_options (*),
          label_tiers (*),
          manufacturing_tiers (*)
        `)
        .eq('id', productId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!productId,
  });
};