import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Product, productFormSchema } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { z } from "zod";

// UI Components
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type ProductFormValues = z.infer<typeof productFormSchema>;

export default function ProductManagement() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const { toast } = useToast();

  // Form setup
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "",
      points: 0,
    },
  });
  
  const editForm = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "",
      points: 0,
    },
  });

  // Query to fetch products
  const {
    data: products = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["/api/products"],
    queryFn: async () => {
      const res = await fetch("/api/products");
      if (!res.ok) throw new Error("Failed to fetch products");
      return res.json();
    },
  });

  // Mutation to create a new product
  const createProductMutation = useMutation({
    mutationFn: async (data: ProductFormValues) => {
      return apiRequest("/api/products", {
        method: "POST",
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      toast({
        title: "Product created",
        description: "Your product has been successfully created.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setIsCreateModalOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create product",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation to update a product
  const updateProductMutation = useMutation({
    mutationFn: async (data: ProductFormValues & { id: number }) => {
      const { id, ...productData } = data;
      return apiRequest(`/api/products/${id}`, {
        method: "PUT",
        body: JSON.stringify(productData)
      });
    },
    onSuccess: () => {
      toast({
        title: "Product updated",
        description: "The product has been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setIsEditModalOpen(false);
      editForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update product",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation to delete a product
  const deleteProductMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/products/${id}`, {
        method: "DELETE"
      });
    },
    onSuccess: () => {
      toast({
        title: "Product deleted",
        description: "The product has been successfully deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setIsDeleteDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete product",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Form submission handlers
  function onSubmit(data: ProductFormValues) {
    createProductMutation.mutate(data);
  }

  function onEditSubmit(data: ProductFormValues) {
    if (!selectedProduct) return;
    updateProductMutation.mutate({
      id: selectedProduct.id,
      ...data,
    });
  }

  function handleEditClick(product: Product) {
    setSelectedProduct(product);
    editForm.reset({
      name: product.name,
      points: product.points,
    });
    setIsEditModalOpen(true);
  }

  function handleDeleteClick(product: Product) {
    setSelectedProduct(product);
    setIsDeleteDialogOpen(true);
  }

  function confirmDelete() {
    if (selectedProduct) {
      deleteProductMutation.mutate(selectedProduct.id);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Product Management</CardTitle>
          <CardDescription>
            Manage products and their associated points
          </CardDescription>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Product
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-10">Loading products...</div>
        ) : (
          <Table>
            <TableCaption>List of all products in the system</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Product Name</TableHead>
                <TableHead className="text-center">Points</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-6">
                    No products found. Add a product to get started.
                  </TableCell>
                </TableRow>
              ) : (
                products.map((product: Product) => (
                  <TableRow key={product.id}>
                    <TableCell>{product.name}</TableCell>
                    <TableCell className="text-center">{product.points}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditClick(product)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClick(product)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Create Product Dialog */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Product</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter product name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="points"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Points</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="Enter points value" 
                        {...field}
                        onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    form.reset();
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={createProductMutation.isPending}
                >
                  {createProductMutation.isPending ? "Creating..." : "Add Product"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Product Dialog */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-6">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter product name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="points"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Points</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="Enter points value" 
                        {...field}
                        onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    editForm.reset();
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={updateProductMutation.isPending}
                >
                  {updateProductMutation.isPending ? "Updating..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              product{" "}
              <span className="font-semibold">{selectedProduct?.name}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              disabled={deleteProductMutation.isPending}
            >
              {deleteProductMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}