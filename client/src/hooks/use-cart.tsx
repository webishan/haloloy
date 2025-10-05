import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export function useCart() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: cartItems = [], isLoading } = useQuery({
    queryKey: ['/api/cart'],
    enabled: !!localStorage.getItem('token')
  });

  const addToCartMutation = useMutation({
    mutationFn: async ({ productId, quantity }: { productId: string; quantity: number }) => {
      const response = await apiRequest('/api/cart', 'POST', { productId, quantity });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
      toast({
        title: "Added to cart",
        description: "Product has been added to your cart successfully."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add product to cart",
        variant: "destructive"
      });
    }
  });

  const updateCartMutation = useMutation({
    mutationFn: async ({ id, quantity }: { id: string; quantity: number }) => {
      const response = await apiRequest(`/api/cart/${id}`, 'PUT', { quantity });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update cart item",
        variant: "destructive"
      });
    }
  });

  const removeFromCartMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest(`/api/cart/${id}`, 'DELETE');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
      toast({
        title: "Removed from cart",
        description: "Product has been removed from your cart."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove item from cart",
        variant: "destructive"
      });
    }
  });

  const cartTotal = Array.isArray(cartItems) ? cartItems.reduce((total: number, item: any) => {
    return total + (parseFloat(item.product?.price || 0) * item.quantity);
  }, 0) : 0;

  const cartCount = Array.isArray(cartItems) ? cartItems.reduce((total: number, item: any) => total + item.quantity, 0) : 0;

  return {
    cartItems,
    cartTotal,
    cartCount,
    isLoading,
    addToCart: addToCartMutation.mutate,
    updateCart: updateCartMutation.mutate,
    removeFromCart: removeFromCartMutation.mutate,
    addingToCart: addToCartMutation.isPending,
    updatingCart: updateCartMutation.isPending,
    removingFromCart: removeFromCartMutation.isPending
  };
}
