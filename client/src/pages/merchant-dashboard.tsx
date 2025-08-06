import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  LayoutDashboard, Package, ShoppingCart, Coins, BarChart, 
  Plus, Edit, Trash2, DollarSign, TrendingUp, Users, Store,
  Star, Award, Calendar, Eye
} from 'lucide-react';

export default function MerchantDashboard() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);

  const { data: dashboardData = {}, isLoading } = useQuery({
    queryKey: ['/api/dashboard/merchant'],
    enabled: !!user && user.role === 'merchant'
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['/api/categories']
  });

  const { data: brands = [] } = useQuery({
    queryKey: ['/api/brands']
  });

  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    price: '',
    originalPrice: '',
    sku: '',
    stock: '',
    categoryId: '',
    brandId: '',
    pointsReward: '',
    images: []
  });

  const createProductMutation = useMutation({
    mutationFn: async (productData: any) => {
      const response = await apiRequest('POST', '/api/products', productData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/merchant'] });
      setIsAddProductOpen(false);
      setProductForm({
        name: '', description: '', price: '', originalPrice: '', sku: '', 
        stock: '', categoryId: '', brandId: '', pointsReward: '', images: []
      });
      toast({
        title: "Product created",
        description: "Your product has been added successfully."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create product",
        variant: "destructive"
      });
    }
  });

  const updateProductMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiRequest('PUT', `/api/products/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/merchant'] });
      setEditingProduct(null);
      toast({
        title: "Product updated",
        description: "Your product has been updated successfully."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update product",
        variant: "destructive"
      });
    }
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/products/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/merchant'] });
      toast({
        title: "Product deleted",
        description: "Your product has been removed successfully."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete product",
        variant: "destructive"
      });
    }
  });

  const handleProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const productData = {
      ...productForm,
      price: parseFloat(productForm.price),
      originalPrice: productForm.originalPrice ? parseFloat(productForm.originalPrice) : undefined,
      stock: parseInt(productForm.stock),
      pointsReward: parseInt(productForm.pointsReward),
      slug: productForm.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    };

    if (editingProduct) {
      updateProductMutation.mutate({ id: editingProduct.id, data: productData });
    } else {
      createProductMutation.mutate(productData);
    }
  };

  if (isLoading) {
    return (
      <div className="pt-32 min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const merchant = dashboardData?.merchant || profile;
  const products = dashboardData?.products || [];
  const recentOrders = dashboardData?.recentOrders || [];

  return (
    <div className="pt-32 min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-white font-bold">
                      {merchant?.businessName?.charAt(0) || user?.firstName?.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold">{merchant?.businessName || `${user?.firstName}'s Store`}</h3>
                    <p className="text-sm text-gray-600 capitalize">{merchant?.tier || 'Merchant'}</p>
                  </div>
                </div>

                <nav className="space-y-2">
                  <a href="#" className="flex items-center space-x-3 p-3 bg-primary/10 text-primary rounded-lg">
                    <LayoutDashboard className="w-5 h-5" />
                    <span>Dashboard</span>
                  </a>
                  <a href="#products" className="flex items-center space-x-3 p-3 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                    <Package className="w-5 h-5" />
                    <span>Products</span>
                  </a>
                  <a href="#orders" className="flex items-center space-x-3 p-3 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                    <ShoppingCart className="w-5 h-5" />
                    <span>Orders</span>
                  </a>
                  <a href="#cashback" className="flex items-center space-x-3 p-3 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                    <Coins className="w-5 h-5" />
                    <span>Cashback</span>
                  </a>
                  <a href="#analytics" className="flex items-center space-x-3 p-3 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                    <BarChart className="w-5 h-5" />
                    <span>Analytics</span>
                  </a>
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Merchant Dashboard</h1>
              <p className="text-gray-600">Manage your store and track performance</p>
            </div>

            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="products">Products</TabsTrigger>
                <TabsTrigger value="orders">Orders</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                {/* Stats Cards */}
                <div className="grid md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Total Sales</p>
                          <p className="text-2xl font-bold text-green-600">${merchant?.totalSales || '0.00'}</p>
                        </div>
                        <div className="p-3 bg-green-100 rounded-lg">
                          <DollarSign className="w-6 h-6 text-green-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Total Orders</p>
                          <p className="text-2xl font-bold text-blue-600">{merchant?.totalOrders || 0}</p>
                        </div>
                        <div className="p-3 bg-blue-100 rounded-lg">
                          <ShoppingCart className="w-6 h-6 text-blue-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Cashback Earned</p>
                          <p className="text-2xl font-bold text-primary">${merchant?.totalCashback || '0.00'}</p>
                        </div>
                        <div className="p-3 bg-primary/10 rounded-lg">
                          <Coins className="w-6 h-6 text-primary" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Products</p>
                          <p className="text-2xl font-bold text-purple-600">{merchant?.productCount || 0}</p>
                        </div>
                        <div className="p-3 bg-purple-100 rounded-lg">
                          <Package className="w-6 h-6 text-purple-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Orders */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Recent Orders</span>
                      <Button variant="ghost" size="sm">View All</Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {recentOrders.length > 0 ? (
                      <div className="space-y-4">
                        {recentOrders.slice(0, 5).map((order: any) => (
                          <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center space-x-4">
                              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                                <ShoppingCart className="w-5 h-5 text-gray-600" />
                              </div>
                              <div>
                                <h4 className="font-medium">Order #{order.orderNumber}</h4>
                                <p className="text-sm text-gray-600">
                                  {new Date(order.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-4">
                              <div className="text-right">
                                <p className="font-semibold">${order.totalAmount}</p>
                                <p className="text-sm text-primary">+{order.pointsEarned} pts</p>
                              </div>
                              <Badge variant={
                                order.status === 'delivered' ? 'default' :
                                order.status === 'shipped' ? 'secondary' :
                                order.status === 'confirmed' ? 'outline' : 'destructive'
                              }>
                                {order.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                        <p className="text-gray-500">No recent orders</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="products">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Product Management</span>
                      <Dialog open={isAddProductOpen} onOpenChange={setIsAddProductOpen}>
                        <DialogTrigger asChild>
                          <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            Add Product
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
                          </DialogHeader>
                          <form onSubmit={handleProductSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="name">Product Name</Label>
                                <Input
                                  id="name"
                                  value={productForm.name}
                                  onChange={(e) => setProductForm(prev => ({ ...prev, name: e.target.value }))}
                                  required
                                />
                              </div>
                              <div>
                                <Label htmlFor="sku">SKU</Label>
                                <Input
                                  id="sku"
                                  value={productForm.sku}
                                  onChange={(e) => setProductForm(prev => ({ ...prev, sku: e.target.value }))}
                                  required
                                />
                              </div>
                            </div>

                            <div>
                              <Label htmlFor="description">Description</Label>
                              <Textarea
                                id="description"
                                value={productForm.description}
                                onChange={(e) => setProductForm(prev => ({ ...prev, description: e.target.value }))}
                                rows={3}
                              />
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                              <div>
                                <Label htmlFor="price">Price ($)</Label>
                                <Input
                                  id="price"
                                  type="number"
                                  step="0.01"
                                  value={productForm.price}
                                  onChange={(e) => setProductForm(prev => ({ ...prev, price: e.target.value }))}
                                  required
                                />
                              </div>
                              <div>
                                <Label htmlFor="originalPrice">Original Price ($)</Label>
                                <Input
                                  id="originalPrice"
                                  type="number"
                                  step="0.01"
                                  value={productForm.originalPrice}
                                  onChange={(e) => setProductForm(prev => ({ ...prev, originalPrice: e.target.value }))}
                                />
                              </div>
                              <div>
                                <Label htmlFor="stock">Stock</Label>
                                <Input
                                  id="stock"
                                  type="number"
                                  value={productForm.stock}
                                  onChange={(e) => setProductForm(prev => ({ ...prev, stock: e.target.value }))}
                                  required
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="categoryId">Category</Label>
                                <Select value={productForm.categoryId} onValueChange={(value) => setProductForm(prev => ({ ...prev, categoryId: value }))}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select category" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {categories?.map((category: any) => (
                                      <SelectItem key={category.id} value={category.id}>
                                        {category.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label htmlFor="brandId">Brand (Optional)</Label>
                                <Select value={productForm.brandId} onValueChange={(value) => setProductForm(prev => ({ ...prev, brandId: value }))}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select brand" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {brands?.map((brand: any) => (
                                      <SelectItem key={brand.id} value={brand.id}>
                                        {brand.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <div>
                              <Label htmlFor="pointsReward">Reward Points</Label>
                              <Input
                                id="pointsReward"
                                type="number"
                                value={productForm.pointsReward}
                                onChange={(e) => setProductForm(prev => ({ ...prev, pointsReward: e.target.value }))}
                                required
                              />
                            </div>

                            <div className="flex justify-end space-x-2">
                              <Button type="button" variant="outline" onClick={() => {
                                setIsAddProductOpen(false);
                                setEditingProduct(null);
                                setProductForm({
                                  name: '', description: '', price: '', originalPrice: '', sku: '', 
                                  stock: '', categoryId: '', brandId: '', pointsReward: '', images: []
                                });
                              }}>
                                Cancel
                              </Button>
                              <Button type="submit" disabled={createProductMutation.isPending || updateProductMutation.isPending}>
                                {createProductMutation.isPending || updateProductMutation.isPending ? 'Saving...' : 'Save Product'}
                              </Button>
                            </div>
                          </form>
                        </DialogContent>
                      </Dialog>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {products.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="text-left py-3 px-4 font-semibold text-gray-700">Product</th>
                              <th className="text-left py-3 px-4 font-semibold text-gray-700">Price</th>
                              <th className="text-left py-3 px-4 font-semibold text-gray-700">Stock</th>
                              <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                              <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {products.map((product: any) => (
                              <tr key={product.id} className="border-b border-gray-100">
                                <td className="py-4 px-4">
                                  <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                                      <Package className="w-5 h-5 text-gray-600" />
                                    </div>
                                    <div>
                                      <p className="font-medium">{product.name}</p>
                                      <p className="text-sm text-gray-600">SKU: {product.sku}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-4 px-4 font-semibold">${product.price}</td>
                                <td className="py-4 px-4">{product.stock}</td>
                                <td className="py-4 px-4">
                                  <Badge variant={product.isActive ? 'default' : 'secondary'}>
                                    {product.isActive ? 'Active' : 'Inactive'}
                                  </Badge>
                                </td>
                                <td className="py-4 px-4">
                                  <div className="flex space-x-2">
                                    <Button 
                                      size="sm" 
                                      variant="ghost"
                                      asChild
                                    >
                                      <Link href={`/product/${product.slug}`}>
                                        <Eye className="w-4 h-4" />
                                      </Link>
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      variant="ghost"
                                      onClick={() => {
                                        setEditingProduct(product);
                                        setProductForm({
                                          name: product.name,
                                          description: product.description || '',
                                          price: product.price,
                                          originalPrice: product.originalPrice || '',
                                          sku: product.sku,
                                          stock: product.stock.toString(),
                                          categoryId: product.categoryId,
                                          brandId: product.brandId || '',
                                          pointsReward: product.pointsReward.toString(),
                                          images: product.images || []
                                        });
                                        setIsAddProductOpen(true);
                                      }}
                                    >
                                      <Edit className="w-4 h-4" />
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      variant="ghost"
                                      onClick={() => deleteProductMutation.mutate(product.id)}
                                      disabled={deleteProductMutation.isPending}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Package className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                        <h3 className="text-lg font-medium mb-2">No products yet</h3>
                        <p className="text-gray-500 mb-4">Start by adding your first product to the marketplace.</p>
                        <Button onClick={() => setIsAddProductOpen(true)}>
                          <Plus className="w-4 h-4 mr-2" />
                          Add Product
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="orders">
                <Card>
                  <CardHeader>
                    <CardTitle>Order Management</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {recentOrders.length > 0 ? (
                      <div className="space-y-4">
                        {recentOrders.map((order: any) => (
                          <div key={order.id} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-4">
                              <div>
                                <h4 className="font-semibold">Order #{order.orderNumber}</h4>
                                <p className="text-sm text-gray-600">
                                  {new Date(order.createdAt).toLocaleDateString()} • ${order.totalAmount}
                                </p>
                              </div>
                              <Badge>{order.status}</Badge>
                            </div>
                            <div className="text-sm text-gray-600">
                              <p>Customer: {order.shippingAddress?.firstName} {order.shippingAddress?.lastName}</p>
                              <p>Items: {order.items?.length || 0} product(s)</p>
                              <p>Points Earned: {order.pointsEarned}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                        <h3 className="text-lg font-medium mb-2">No orders yet</h3>
                        <p className="text-gray-500">Orders will appear here when customers purchase your products.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="analytics">
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Performance Metrics</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-primary mb-2">{merchant?.tier || 'Merchant'}</div>
                          <p className="text-sm text-gray-600">Current Tier</p>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600 mb-2">
                            {merchant?.totalOrders ? Math.round((merchant.totalOrders / 30) * 100) / 100 : 0}
                          </div>
                          <p className="text-sm text-gray-600">Orders/Day Average</p>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600 mb-2">
                            ${merchant?.totalSales ? (parseFloat(merchant.totalSales) / (merchant.totalOrders || 1)).toFixed(2) : '0.00'}
                          </div>
                          <p className="text-sm text-gray-600">Average Order Value</p>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-accent mb-2">
                            {merchant?.loyaltyPointsBalance || 0}
                          </div>
                          <p className="text-sm text-gray-600">Loyalty Points Balance</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Cashback Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                          <div>
                            <h4 className="font-medium text-green-800">Instant Cashback (15%)</h4>
                            <p className="text-sm text-green-600">From points distributed to customers</p>
                          </div>
                          <div className="text-green-800 font-semibold">
                            ${(parseFloat(merchant?.totalCashback || '0') * 0.6).toFixed(2)}
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                          <div>
                            <h4 className="font-medium text-blue-800">Affiliate Cashback (2%)</h4>
                            <p className="text-sm text-blue-600">From referral commissions</p>
                          </div>
                          <div className="text-blue-800 font-semibold">
                            ${(parseFloat(merchant?.totalCashback || '0') * 0.3).toFixed(2)}
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                          <div>
                            <h4 className="font-medium text-purple-800">Profit Share (1%)</h4>
                            <p className="text-sm text-purple-600">From global merchant network</p>
                          </div>
                          <div className="text-purple-800 font-semibold">
                            ${(parseFloat(merchant?.totalCashback || '0') * 0.1).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
