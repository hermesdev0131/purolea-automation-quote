import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Download, Sparkles, Beaker, Package, Tag, Factory, MessageCircle, DollarSign, ChevronDown, ShoppingCart } from "lucide-react"
import { useProducts, useLabelTiers, useManufacturingTiers, useCreateQuote, usePackagingOptions, useFormulas } from "@/integrations/supabase/hooks"
import { useToast } from "@/hooks/use-toast"


interface Product {
  id: string
  name: string
  size_oz: number
  created_at: string
}

interface QuoteData {
  selectedProduct: string
  formulaCost: number
  productSize: number
  packagingCost: number
  labelCost: number
  manufacturingFee: number
  quantity: number
  isClientPackaging: boolean
  isClientLabel: boolean
  notes: string
  clientName: string
  clientEmail: string
}

interface CostBreakdown {
  formulaCostPerUnit: number
  packagingCostPerUnit: number
  labelCostPerUnit: number
  manufacturingFeePerUnit: number
  totalUnitCost: number
  totalProjectCost: number
}

const QuoteCalculator = () => {
  const { toast } = useToast()
  
  // Supabase hooks
  const { data: products = [], isLoading: productsLoading } = useProducts()
  const { data: labelTiers = [] } = useLabelTiers()
  const { data: manufacturingTiers = [] } = useManufacturingTiers()
  const { data: formulas = [] } = useFormulas()
  const { data: packagingOptions = [] } = usePackagingOptions()
  const createQuoteMutation = useCreateQuote()

  const [quoteData, setQuoteData] = useState<QuoteData>({
    selectedProduct: '',
    formulaCost: 0,
    productSize: 0,
    packagingCost: 0,
    labelCost: 0,
    manufacturingFee: 0,
    quantity: 100,
    isClientPackaging: false,
    isClientLabel: false,
    notes: "",
    clientName: "",
    clientEmail: ""
  })

  const [costs, setCosts] = useState<CostBreakdown>({
    formulaCostPerUnit: 0,
    packagingCostPerUnit: 0,
    labelCostPerUnit: 0,
    manufacturingFeePerUnit: 0,
    totalUnitCost: 0,
    totalProjectCost: 0
  })

  // Modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [modalClientName, setModalClientName] = useState("")
  const [modalClientEmail, setModalClientEmail] = useState("")
  const [emailError, setEmailError] = useState("")

  // Manufacturing fee tiers based on quantity and product
  const getManufacturingFee = (quantity: number, productId?: string): number => {
    if (!productId) return 0
    
    const productTiers = manufacturingTiers
      .filter(tier => tier.product_id === productId || tier.product_id === null)
      .sort((a, b) => b.min_quantity - a.min_quantity)
    
    for (const tier of productTiers) {
      if (quantity >= tier.min_quantity) {
        return tier.fee_per_unit
      }
    }
    
    // Fallback to default pricing only if we have manufacturing tiers data
    if (manufacturingTiers.length > 0) {
      if (quantity >= 1000) return 2.50
      if (quantity >= 500) return 3.00
      return 4.00
    }
    
    return 0
  }

  // Label cost tiers based on quantity and product
  const getLabelCost = (quantity: number, productId?: string): number => {
    if (!productId) return 0
    
    const productTiers = labelTiers
      .filter(tier => tier.product_id === productId || tier.product_id === null)
      .sort((a, b) => b.min_quantity - a.min_quantity)
    
    for (const tier of productTiers) {
      if (quantity >= tier.min_quantity) {
        return tier.label_cost
      }
    }
    
    // Fallback to default pricing only if we have label tiers data
    if (labelTiers.length > 0) {
      if (quantity >= 1000) return 0.50
      if (quantity >= 500) return 0.65
      return 0.75
    }
    
    return 0
  }

  // Recalculate costs whenever inputs change
  useEffect(() => {
    const formulaCostPerUnit = quoteData.formulaCost * quoteData.productSize
    const packagingCostPerUnit = quoteData.isClientPackaging ? 0 : quoteData.packagingCost
    const labelCostPerUnit = quoteData.isClientLabel ? 0 : getLabelCost(quoteData.quantity, quoteData.selectedProduct)
    const manufacturingFeePerUnit = getManufacturingFee(quoteData.quantity, quoteData.selectedProduct)
    
    console.log(quoteData.quantity);
    const totalUnitCost = formulaCostPerUnit + packagingCostPerUnit + labelCostPerUnit + manufacturingFeePerUnit
    const totalProjectCost = totalUnitCost * quoteData.quantity

    setCosts({
      formulaCostPerUnit,
      packagingCostPerUnit,
      labelCostPerUnit,
      manufacturingFeePerUnit,
      totalUnitCost,
      totalProjectCost
    })
  }, [quoteData])

  const updateQuoteData = (field: keyof QuoteData, value: any) => {
    setQuoteData(prev => ({ ...prev, [field]: value }))
  }

   // Get pricing tiers for display
  const getManufacturingTiersForDisplay = () => {
    const productTiers = manufacturingTiers
      .filter(tier => tier.product_id === quoteData.selectedProduct || tier.product_id === null)
      .sort((a, b) => a.min_quantity - b.min_quantity)
    
    if (productTiers.length > 0) {
      return productTiers
    }
    
    // Fallback to default tiers
    return [
      { min_quantity: 100, fee_per_unit: 0 },
      { min_quantity: 500, fee_per_unit: 0 },
      { min_quantity: 1000, fee_per_unit: 0}
    ]
  }

  const getLabelTiersForDisplay = () => {
    const productTiers = labelTiers
      .filter(tier => tier.product_id === quoteData.selectedProduct || tier.product_id === null)
      .sort((a, b) => a.min_quantity - b.min_quantity)
    
    if (productTiers.length > 0) {
      return productTiers
    }
    
    // Fallback to default tiers
    return [
      { min_quantity: 100, label_cost: 0 },
      { min_quantity: 500, label_cost: 0 },
      { min_quantity: 1000, label_cost: 0}
    ]
  }

   // Helper function to render manufacturing tier pricing
  const renderManufacturingTiers = () => {
    const tiers = getManufacturingTiersForDisplay()
    return tiers.map((tier, index) => {
      const nextTier = tiers[index + 1]
      const rangeText = nextTier 
        ? `${tier.min_quantity}-${nextTier.min_quantity - 1} units`
        : `${tier.min_quantity}+ units`
      
      return (
        <li key={tier.min_quantity}>
          • {rangeText}: ${tier.fee_per_unit.toFixed(2)} per unit
        </li>
      )
    })
  }

  // Helper function to render label tier pricing
  const renderLabelTiers = () => {
    const tiers = getLabelTiersForDisplay()
    return tiers.map((tier, index) => {
      const nextTier = tiers[index + 1]
      const rangeText = nextTier 
        ? `${tier.min_quantity}-${nextTier.min_quantity - 1} units`
        : `${tier.min_quantity}+ units`
      
      return (
        <li key={tier.min_quantity}>
          • {rangeText}: ${tier.label_cost.toFixed(2)} per label
        </li>
      )
    })
   }


  const handleProductSelect = (productId: string) => {
    const product = products.find(p => p.id === productId)
    const productFormula = formulas.find(f => f.product_id === productId)
    const defaultPackaging = packagingOptions.find(p => p.product_id === productId)
    
    if (product) {
      setQuoteData(prev => ({
        ...prev,
        selectedProduct: productId,
        formulaCost: productFormula?.price_per_oz || 0,
        productSize: product.size_oz || 0,
        packagingCost: defaultPackaging?.price || 0
      }))
    }
  }

  // Email validation function
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleEmailChange = (email: string) => {
    setModalClientEmail(email)
    if (email && !validateEmail(email)) {
      setEmailError("Please enter a valid email address")
    } else {
      setEmailError("")
    }
  }

  const handleSaveQuoteClick = () => {
    if (!quoteData.selectedProduct) {
      toast({
        title: "Error",
        description: "Please select a product first",
        variant: "destructive"
      })
      return
    }

    // Pre-populate modal with existing client data if available
    setModalClientName(quoteData.clientName)
    setModalClientEmail(quoteData.clientEmail)
    setShowConfirmModal(true)
  }

  const handleConfirmSaveQuote = async () => {
    if (!modalClientName || !modalClientEmail) {
      toast({
        title: "Error", 
        description: "Please provide client name and email",
        variant: "destructive"
      })
      return
    }

    if (!validateEmail(modalClientEmail)) {
      toast({
        title: "Error", 
        description: "Please enter a valid email address",
        variant: "destructive"
      })
      return
    }

    try {
      await createQuoteMutation.mutateAsync({
        product_id: quoteData.selectedProduct,
        quantity: quoteData.quantity,
        formula_cost: costs.formulaCostPerUnit * quoteData.quantity,
        packaging_cost: costs.packagingCostPerUnit * quoteData.quantity,
        label_cost: costs.labelCostPerUnit * quoteData.quantity,
        manufacturing_fee: costs.manufacturingFeePerUnit * quoteData.quantity,
        total_unit_cost: costs.totalUnitCost,
        client_name: modalClientName,
        client_email: modalClientEmail,
        created_by: 'admin@purolea.com'
      })

      // Update the main form with the modal data
      setQuoteData(prev => ({
        ...prev,
        clientName: modalClientName,
        clientEmail: modalClientEmail
      }))

      setShowConfirmModal(false)
      toast({
        title: "Success",
        description: "Quote saved successfully!",
        variant: "default"
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save quote. Please try again.",
        variant: "destructive"
      })
    }
  }

  const handleCancelModal = () => {
    setShowConfirmModal(false)
    setModalClientName("")
    setModalClientEmail("")
    setEmailError("")
  }

  const generatePDF = () => {
    // Simple print-friendly version
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    // Get the selected product name
    const selectedProduct = products.find(p => p.id === quoteData.selectedProduct)
    const productName = selectedProduct ? selectedProduct.name : 'Unknown Product'

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Purolea Quote - ${productName} - ${new Date().toLocaleDateString()}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 30px; }
            .section { margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
            th { background-color: #f5f5f5; font-weight: bold; }
            .total { font-weight: bold; background-color: #f0f0f0; }
            .notes { background-color: #f9f9f9; padding: 15px; border-left: 4px solid #ccc; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Purolea Production Quote</h1>
            <h2>${productName}</h2>
            <p>Generated on ${new Date().toLocaleDateString()}</p>
          </div>
          
          <div class="section">
            <h3>Product Specifications</h3>
            <p><strong>Product Name:</strong> ${productName}</p>
            <p><strong>Formula Cost:</strong> $${quoteData.formulaCost.toFixed(2)} per oz</p>
            <p><strong>Product Size:</strong> ${quoteData.productSize} oz</p>
            <p><strong>Production Quantity:</strong> ${quoteData.quantity} units</p>
            <p><strong>Packaging:</strong> ${quoteData.isClientPackaging ? 'Client Provided' : '$' + quoteData.packagingCost.toFixed(2) + ' per unit'}</p>
            <p><strong>Labels:</strong> ${quoteData.isClientLabel ? 'Client Provided' : '$' + costs.labelCostPerUnit.toFixed(2) + ' per unit'}</p>
          </div>

          <table>
            <tr><th>Cost Component</th><th>Per Unit</th><th>Total (${quoteData.quantity} units)</th></tr>
            <tr><td>🧪 Formula Cost</td><td>$${costs.formulaCostPerUnit.toFixed(2)}</td><td>$${(costs.formulaCostPerUnit * quoteData.quantity).toFixed(2)}</td></tr>
            <tr><td>📦 Packaging</td><td>$${costs.packagingCostPerUnit.toFixed(2)}</td><td>$${(costs.packagingCostPerUnit * quoteData.quantity).toFixed(2)}</td></tr>
            <tr><td>🏷️ Label Printing</td><td>$${costs.labelCostPerUnit.toFixed(2)}</td><td>$${(costs.labelCostPerUnit * quoteData.quantity).toFixed(2)}</td></tr>
            <tr><td>🏭 Manufacturing</td><td>$${costs.manufacturingFeePerUnit.toFixed(2)}</td><td>$${(costs.manufacturingFeePerUnit * quoteData.quantity).toFixed(2)}</td></tr>
            <tr class="total"><td><strong>Total</strong></td><td><strong>$${costs.totalUnitCost.toFixed(2)}</strong></td><td><strong>$${costs.totalProjectCost.toFixed(2)}</strong></td></tr>
          </table>

          ${quoteData.notes ? `<div class="notes"><h4>Notes:</h4><p>${quoteData.notes}</p></div>` : ''}
          
          <div class="section">
            <p><small>Lead time: 3–4 weeks from order confirmation</small></p>
          </div>
        </body>
      </html>
    `
    
    printWindow.document.write(htmlContent)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => printWindow.print(), 100)
  }

  return (
    <div className="bg-background font-elegant min-h-[600px]">
      {/* Compact Header */}
      <div className="bg-background border-b border-border">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-lg font-semibold text-foreground">Purolea Quote Calculator</h1>
                <p className="text-sm text-muted-foreground">Professional cosmetic production cost estimator</p>
              </div>
            </div>

          </div>
        </div>
      </div>

      <div className="px-4 py-4">
        <div className="grid lg:grid-cols-[70%_30%] gap-6">
          {/* Input Form */}
          <div className="space-y-4">
            {/* Product Selection & Packaging Row */}
            <div className="grid sm:grid-cols-2 gap-4">
              {/* Product Selection */}
              <Card className="shadow-soft border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Beaker className="h-4 w-4" />
                    Product Selection
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="product" className="text-sm">Select Product Type</Label>
                    <Select value={quoteData.selectedProduct} onValueChange={handleProductSelect}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Choose a product..." />
                      </SelectTrigger>
                      <SelectContent>
                        {productsLoading ? (
                          <SelectItem value="loading" disabled>Loading products...</SelectItem>
                        ) : products.length === 0 ? (
                          <SelectItem value="no-products" disabled>No products available</SelectItem>
                        ) : (
                          products.map((product) => {
                            const productFormula = formulas.find(f => f.product_id === product.id)
                            return (
                              <SelectItem key={product.id} value={product.id}>
                                <div className="flex items-center gap-2">
                                  <span>🧴</span>
                                  <div className="flex flex-col">
                                    <span className="font-medium text-sm">{product.name}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {product.size_oz}oz • ${productFormula?.price_per_oz?.toFixed(2) || '0.00'}/oz
                                    </span>
                                  </div>
                                </div>
                              </SelectItem>
                            )
                          })
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="formulaCost" className="text-sm">Formula Cost (per oz)</Label>
                      <Input
                        id="formulaCost"
                        type="number"
                        step="0.01"
                        value={quoteData.formulaCost}
                        onChange={(e) => updateQuoteData('formulaCost', parseFloat(e.target.value) || 0)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="productSize" className="text-sm">Product Size (oz)</Label>
                      <Input
                        id="productSize"
                        type="number"
                        step="0.1"
                        value={quoteData.productSize}
                        onChange={(e) => updateQuoteData('productSize', parseFloat(e.target.value) || 0)}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Packaging Section */}
              <Card className="shadow-soft border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Package className="h-4 w-4" />
                    Packaging
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-9">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium">Client Provides</Label>
                      <p className="text-sm text-muted-foreground">Toggle if client supplies their own containers</p>
                    </div>
                    <Switch
                      checked={quoteData.isClientPackaging}
                      onCheckedChange={(checked) => updateQuoteData('isClientPackaging', checked)}
                    />
                  </div>
                  {!quoteData.isClientPackaging && (
                    <div>
                      <Label htmlFor="packagingCost" className="text-sm">Cost (per unit)</Label>
                      <Input
                        id="packagingCost"
                        type="number"
                        step="0.01"
                        value={quoteData.packagingCost}
                        onChange={(e) => updateQuoteData('packagingCost', parseFloat(e.target.value) || 0)}
                        className="mt-1"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Manufacturing & Labels Row */}
            <div className="grid sm:grid-cols-2 gap-4">
              {/* Manufacturing Section */}
              <Card className="shadow-soft border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Factory className="h-4 w-4" />
                    Manufacturing
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="quantity" className="text-sm font-medium">Production Quantity</Label>
                    <Select value={quoteData.quantity.toString()} onValueChange={(value) => updateQuoteData('quantity', parseInt(value))}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="100">100 units</SelectItem>
                        <SelectItem value="500">500 units</SelectItem>
                        <SelectItem value="1000">1000 units</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="text-sm font-medium">Manufacturing Fee Structure:</p>
                    <p className="text-xs text-primary font-medium mb-2">
                      Current selection: {quoteData.quantity} units - ${getManufacturingFee(quoteData.quantity, quoteData.selectedProduct).toFixed(2)} per unit
                    </p>
                    <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                      {renderManufacturingTiers()}
                    </ul>
                  </div>
                </CardContent>
              </Card>

              {/* Label Section */}
              <Card className="shadow-soft border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Tag className="h-4 w-4" />
                    Labels
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-9">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className="text-sm font-medium">Client Provides Labels</Label>
                      <p className="text-sm text-muted-foreground mt-1">Toggle if client supplies pre-printed labels</p>
                    </div>
                    <Switch
                      checked={quoteData.isClientLabel}
                      onCheckedChange={(checked) => updateQuoteData('isClientLabel', checked)}
                    />
                  </div>
                  {!quoteData.isClientLabel && (
                    <div className="bg-muted p-4 rounded-lg">
                      <p className="text-sm font-medium">Label Printing Pricing:</p>
                      <p className="text-xs text-primary font-medium mb-2">
                        Current selection: {quoteData.quantity} units - ${getLabelCost(quoteData.quantity, quoteData.selectedProduct).toFixed(2)} per label
                      </p>
                      <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                        {renderLabelTiers()}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Cost Summary */}
          <div className="mr-4">
            <Card className="shadow-elegant border-border">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <DollarSign className="h-4 w-4" />
                  Cost Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Beaker className="h-3 w-3" /> Formula
                    </span>
                    <span className="font-medium">${costs.formulaCostPerUnit.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Package className="h-3 w-3" /> Packaging
                    </span>
                    <span className="font-medium">${costs.packagingCostPerUnit.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Tag className="h-3 w-3" /> Labels
                    </span>
                    <span className="font-medium">${costs.labelCostPerUnit.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Factory className="h-3 w-3" /> Manufacturing
                    </span>
                    <span className="font-medium">${costs.manufacturingFeePerUnit.toFixed(2)}</span>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex justify-between items-center font-semibold">
                    <span>Cost per Unit</span>
                    <span className="text-primary">${costs.totalUnitCost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm text-muted-foreground">
                    <span>× {quoteData.quantity} units</span>
                  </div>
                  <div className="flex justify-between items-center text-lg font-bold bg-primary-soft p-3 rounded-lg">
                    <span>Total Project</span>
                    <span className="text-primary">${costs.totalProjectCost.toFixed(2)}</span>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground text-center pt-2 flex justify-center gap-4">
                  <p>🕒 Lead time: 3–4 weeks</p>
                  <p>📋 Quote valid for 30 days</p>
                </div>

                <Separator />


                {/* Notes and Export PDF inside Cost Summary */}
                <div className="grid sm:grid-cols-[60%_40%] gap-6">
                  {/* Notes Section */}
                  <div className="space-y-4">
                    <Label className="flex items-center gap-2 text-sm font-medium">
                      <MessageCircle className="h-4 w-4" />
                      Notes
                    </Label>
                        <Textarea
                      placeholder="Special requirements..."
                      value={quoteData.notes}
                      onChange={(e) => updateQuoteData('notes', e.target.value)}
                      className="min-h-[80px] text-sm resize-none"
                    />
                  </div>

                  {/* Order and Export PDF Buttons */}
                  <div className="flex flex-col items-end justify-end gap-2 pl-2 pr-4">
                    <Button 
                      onClick={handleSaveQuoteClick}
                      disabled={createQuoteMutation.isPending || productsLoading || products.length === 0 || !quoteData.selectedProduct}
                      variant="default" 
                      size="sm"
                      className="w-full text-xs"
                    >
                      <ShoppingCart className="h-3 w-3" />
                      {createQuoteMutation.isPending ? 'Saving...' : 'Save Quote'}
                    </Button>
                    <Button 
                      onClick={generatePDF} 
                      variant="elegant" 
                      size="sm"
                      className="w-full text-xs"
                    >
                      <Download className="h-3 w-3" />
                      Export Quote PDF
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Quote Order</DialogTitle>
            <DialogDescription>
              Please provide client information to save this quote.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="modal-client-name" className="text-right">
                Client Name
              </Label>
              <Input
                id="modal-client-name"
                value={modalClientName}
                onChange={(e) => setModalClientName(e.target.value)}
                className="col-span-3"
                placeholder="Enter client name"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="modal-client-email" className="text-right">
                Client Email
              </Label>
              <div className="col-span-3">
                <Input
                  id="modal-client-email"
                  type="email"
                  value={modalClientEmail}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  className={emailError ? "border-red-500" : ""}
                  placeholder="Enter client email"
                />
                {emailError && (
                  <p className="text-sm text-red-500 mt-1">{emailError}</p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              onClick={handleConfirmSaveQuote}
              disabled={createQuoteMutation.isPending || !modalClientName || !modalClientEmail || !!emailError}
            >
              {createQuoteMutation.isPending ? 'Ordering...' : 'Order'}
            </Button>
            <Button variant="outline" onClick={handleCancelModal}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default QuoteCalculator