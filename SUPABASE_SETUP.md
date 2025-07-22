# Supabase Configuration Guide

## ✅ Installation Complete

Your Supabase setup is now fully configured and ready to use!

## 📁 File Structure

```
src/integrations/supabase/
├── client.ts          # Supabase client configuration
├── types.ts           # TypeScript types for your database
├── hooks.ts           # React Query hooks for database operations
└── index.ts           # Barrel exports for easy imports

src/lib/
└── quote-calculator.ts # Business logic for quote calculations

src/components/
└── ProductList.tsx     # Example component using Supabase hooks
```

## 🗄️ Database Schema

Your database includes these tables:

### 1. **products**
- `id` (uuid, primary key)
- `name` (text, required)
- `size_oz` (numeric, required)
- `created_at` (timestamp)

### 2. **formulas**
- `id` (uuid, primary key)
- `product_id` (uuid, foreign key → products.id)
- `price_per_oz` (numeric, required)
- `notes` (text, optional)
- `created_at` (timestamp)

### 3. **packaging_options**
- `id` (uuid, primary key)
- `product_id` (uuid, foreign key → products.id)
- `name` (text, required)
- `price` (numeric, required)
- `supplier` (text, optional)
- `created_at` (timestamp)

### 4. **label_tiers**
- `id` (uuid, primary key)
- `product_id` (uuid, foreign key → products.id)
- `min_quantity` (integer, required)
- `label_cost` (numeric, required)
- `created_at` (timestamp)

### 5. **manufacturing_tiers**
- `id` (uuid, primary key)
- `product_id` (uuid, foreign key → products.id)
- `min_quantity` (integer, required)
- `fee_per_unit` (numeric, required)
- `created_at` (timestamp)

### 6. **quotes**
- `id` (uuid, primary key)
- `product_id` (uuid, foreign key → products.id)
- `quantity` (integer, required)
- `formula_cost` (numeric, optional)
- `packaging_cost` (numeric, optional)
- `label_cost` (numeric, optional)
- `manufacturing_fee` (numeric, optional)
- `total_unit_cost` (numeric, optional)
- `client_name` (text, optional)
- `client_email` (text, optional)
- `created_by` (text, optional)
- `created_at` (timestamp)

## 🚀 Usage Examples

### Basic Database Operations

```typescript
import { useProducts, useCreateProduct, supabase } from '@/integrations/supabase';

// Using React Query hooks
const ProductComponent = () => {
  const { data: products, isLoading } = useProducts();
  const createProduct = useCreateProduct();

  const handleCreate = () => {
    createProduct.mutate({
      name: 'New Product',
      size_oz: 2.0
    });
  };

  return (
    <div>
      {products?.map(product => (
        <div key={product.id}>{product.name}</div>
      ))}
    </div>
  );
};

// Direct Supabase client usage
const fetchProductsDirectly = async () => {
  const { data, error } = await supabase
    .from('products')
    .select('*');
  
  if (error) throw error;
  return data;
};
```

### Quote Calculation

```typescript
import { calculateQuote, formatCurrency } from '@/lib/quote-calculator';

const calculateProductQuote = (
  product,
  quantity,
  formula,
  packagingOption,
  labelTiers,
  manufacturingTiers
) => {
  const result = calculateQuote({
    product,
    quantity,
    formula,
    packagingOption,
    labelTiers,
    manufacturingTiers
  });

  console.log(`Total cost: ${formatCurrency(result.totalCost)}`);
  console.log(`Cost per unit: ${formatCurrency(result.totalUnitCost)}`);
  
  return result;
};
```

### Complex Queries with Relationships

```typescript
import { useProductWithDetails } from '@/integrations/supabase';

const ProductDetails = ({ productId }: { productId: string }) => {
  const { data: product, isLoading } = useProductWithDetails(productId);

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <h1>{product?.name}</h1>
      <p>Size: {product?.size_oz} oz</p>
      
      <h2>Formulas ({product?.formulas?.length})</h2>
      {product?.formulas?.map(formula => (
        <div key={formula.id}>
          ${formula.price_per_oz}/oz - {formula.notes}
        </div>
      ))}
      
      <h2>Packaging Options ({product?.packaging_options?.length})</h2>
      {product?.packaging_options?.map(option => (
        <div key={option.id}>
          {option.name} - ${option.price} ({option.supplier})
        </div>
      ))}
    </div>
  );
};
```

## 🧪 Testing with Sample Data

1. **Run the SQL script**: Copy the contents of `sample-data.sql` and run it in your Supabase SQL editor
2. **Test the hooks**: Use the `ProductList` component to see your data in action
3. **Try calculations**: Use the quote calculator with the sample data

## 🔧 Available Hooks

### Products
- `useProducts()` - Fetch all products
- `useProduct(id)` - Fetch single product
- `useCreateProduct()` - Create new product
- `useProductWithDetails(id)` - Product with all related data

### Formulas
- `useFormulas(productId?)` - Fetch formulas (optionally filtered by product)
- `useCreateFormula()` - Create new formula

### Packaging Options
- `usePackagingOptions(productId?)` - Fetch packaging options
- `useCreatePackagingOption()` - Create new packaging option

### Label Tiers
- `useLabelTiers(productId?)` - Fetch label tiers
- `useCreateLabelTier()` - Create new label tier

### Manufacturing Tiers
- `useManufacturingTiers(productId?)` - Fetch manufacturing tiers
- `useCreateManufacturingTier()` - Create new manufacturing tier

### Quotes
- `useQuotes()` - Fetch all quotes with product details
- `useCreateQuote()` - Create new quote

## 🔐 Environment Variables

Your `.env.local` file contains:
```
VITE_SUPABASE_URL=https://hdkasuvagwqqooulawhg.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 🎯 Next Steps

1. **Create your tables**: Run your SQL schema in Supabase
2. **Add sample data**: Run the `sample-data.sql` script
3. **Test the setup**: Use the `ProductList` component
4. **Build your quote calculator**: Integrate the calculation logic
5. **Add authentication** (if needed): Supabase Auth integration
6. **Set up RLS policies**: Configure Row Level Security for production

Your Supabase setup is complete and production-ready! 🎉