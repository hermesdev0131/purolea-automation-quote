import { useProducts, useCreateProduct } from '@/integrations/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/quote-calculator';

export const ProductList = () => {
  const { data: products, isLoading, error } = useProducts();
  const createProduct = useCreateProduct();

  const handleCreateSampleProduct = () => {
    createProduct.mutate({
      name: 'Sample Product',
      size_oz: 8.0,
    });
  };

  if (isLoading) return <div>Loading products...</div>;
  if (error) return <div>Error loading products: {error.message}</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Products</h2>
        <Button 
          onClick={handleCreateSampleProduct}
          disabled={createProduct.isPending}
        >
          {createProduct.isPending ? 'Creating...' : 'Add Sample Product'}
        </Button>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {products?.map((product) => (
          <Card key={product.id}>
            <CardHeader>
              <CardTitle>{product.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Size: {product.size_oz} oz
              </p>
              <p className="text-xs text-gray-500">
                Created: {new Date(product.created_at).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {products?.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No products found. Create your first product!
        </div>
      )}
    </div>
  );
};