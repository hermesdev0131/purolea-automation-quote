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
import { Download, Sparkles, Beaker, Package, Tag, Factory, MessageCircle, DollarSign, ChevronDown, ShoppingCart, Upload, FileText, X, Loader2 } from "lucide-react"
import { useProducts, useLabelTiers, useManufacturingTiers, useCreateQuote, usePackagingOptions, useFormulas } from "@/integrations/supabase/hooks"
import { useToast } from "@/hooks/use-toast"
import jsPDF from 'jspdf'
import { supabase } from "@/integrations/supabase/client"


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

interface N8nResponse {
  name: string
  volume: number
  unitcost: number
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

  // File upload state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState("")
  const [isUploadingToN8n, setIsUploadingToN8n] = useState(false)
  
  // Order/PDF generation loading state
  const [isProcessingOrder, setIsProcessingOrder] = useState(false)
  
  // N8n response state
  const [n8nProductName, setN8nProductName] = useState<string>("")
  const [isN8nProductSelected, setIsN8nProductSelected] = useState(false)

  // Manufacturing fee tiers based on quantity and product
  const getManufacturingFee = (quantity: number, productId?: string): number => {
    // If no productId but we're in n8n mode, use fallback pricing
    if (!productId) {
      if (isN8nProductSelected) {
        if (quantity >= 1000) return 2.50
        if (quantity >= 500) return 3.00
        return 4.00
      }
      return 0
    }
    
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
    // If no productId but we're in n8n mode, use fallback pricing
    if (!productId) {
      if (isN8nProductSelected) {
        if (quantity >= 1000) return 0.6
        if (quantity >= 500) return 0.65
        return 0.75
      }
      return 0
    }
    
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
      if (quantity >= 1000) return 0.6
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
      { min_quantity: 100, fee_per_unit: 4.00 },
      { min_quantity: 500, fee_per_unit: 3.00 },
      { min_quantity: 1000, fee_per_unit: 2.50}
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
      { min_quantity: 100, label_cost: 0.75 },
      { min_quantity: 500, label_cost: 0.65 },
      { min_quantity: 1000, label_cost: 0.6}
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

  // Handle n8n response and auto-populate fields
  const handleN8nResponse = (n8nData: N8nResponse) => {
    // console.log('Processing n8n data:', n8nData);
    
    // Set n8n product name and enable n8n mode
    setN8nProductName(n8nData.name)
    setIsN8nProductSelected(true)
    
    // When n8n responds successfully, use default values for all pricing
    // Clear selected product and use n8n data with default packaging cost
    setQuoteData(prev => ({
      ...prev,
      selectedProduct: '', // Clear selected product to use default pricing
      formulaCost: n8nData.unitcost, // Use n8n unit cost as formula cost
      productSize: n8nData.volume,   // Use n8n volume as product size
      packagingCost: 3 // Use default packaging cost
    }))
    
    toast({
      title: "Data extracted from PDF",
      description: `Product: ${n8nData.name}. Using default pricing values.`,
      variant: "default"
    })
  }

  // Reset n8n state to original select control
  const resetN8nState = () => {
    setN8nProductName("")
    setIsN8nProductSelected(false)
  }

  // Generate comprehensive PDF file for Order button matching full template
  const generateOrderPDFFile = async (clientName: string): Promise<Blob> => {
    const pdf = new jsPDF('p', 'mm', 'a4')
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    let currentY = 20
    
    let productName = 'Unknown Product'
    if (isN8nProductSelected) {
      productName = n8nProductName
    } else {
      const selectedProduct = products.find(p => p.id === quoteData.selectedProduct)
      productName = selectedProduct ? selectedProduct.name : 'Unknown Product'
    }

    // Header - Page 1
    pdf.setFontSize(24)
    pdf.setFont(undefined, 'bold')
    pdf.setTextColor(21, 80, 100) // #155064
    const titleWidth = pdf.getTextWidth('PUROLEA QUOTE & CONTRACT')
    pdf.text('PUROLEA QUOTE & CONTRACT', (pageWidth - titleWidth) / 2, currentY + 10)
    
    currentY += 20
    pdf.setFontSize(16)
    pdf.setFont(undefined, 'normal')
    pdf.setTextColor(0, 0, 0)
    const preparedText = `Prepared for: ${clientName.toUpperCase()}`
    const preparedWidth = pdf.getTextWidth(preparedText)
    pdf.text(preparedText, (pageWidth - preparedWidth) / 2, currentY)
    
    currentY += 10
    pdf.setFont(undefined, 'bold')
    const servicesText = 'Contract Manufacturing & Formulation Services'
    const servicesWidth = pdf.getTextWidth(servicesText)
    pdf.text(servicesText, (pageWidth - servicesWidth) / 2, currentY)
    
    currentY += 10
    pdf.setFontSize(10)
    pdf.setFont(undefined, 'normal')
    pdf.text('Contact: Maria Mattina (+1 734 564 4885)', 20, currentY)
    
    // 1. Project Scope
    currentY += 15
    pdf.setFontSize(16)
    pdf.setFont(undefined, 'bold')
    pdf.setTextColor(21, 80, 100)
    pdf.text('1. Project Scope', 20, currentY)
    
    currentY += 10
    pdf.setFontSize(10)
    pdf.setFont(undefined, 'bold')
    pdf.setTextColor(0, 0, 0)
    pdf.text('Product(s):', 20, currentY)
    
    currentY += 8
    pdf.setFont(undefined, 'normal')
    pdf.text(`• Name(s): ${productName}`, 25, currentY)
    currentY += 6
    pdf.text(`• Size(s): ${quoteData.productSize}oz`, 25, currentY)
    
    currentY += 12
    pdf.setFont(undefined, 'bold')
    pdf.text('Services Included:', 20, currentY)
    currentY += 8
    pdf.setFont(undefined, 'normal')
    pdf.text('• Contract Manufacturing', 25, currentY)
    
    // 2. Quote Summary
    currentY += 15
    pdf.setFontSize(16)
    pdf.setFont(undefined, 'bold')
    pdf.setTextColor(21, 80, 100)
    pdf.text('2. Quote Summary', 20, currentY)
    
    currentY += 10
    // Table setup
    const tableStartY = currentY
    const rowHeight = 8
    
    // Table header
    pdf.setFillColor(240, 240, 240)
    pdf.rect(20, tableStartY - 3, 170, rowHeight, 'F')
    pdf.rect(20, tableStartY - 3, 170, rowHeight, 'S')
    
    pdf.setFontSize(10)
    pdf.setFont(undefined, 'bold')
    pdf.setTextColor(0, 0, 0)
    pdf.text('Item/Qty', 22, tableStartY + 2)
    pdf.text('100', 102, tableStartY + 2)
    pdf.text('500', 132, tableStartY + 2)
    pdf.text('1000', 162, tableStartY + 2)
    
    currentY = tableStartY + rowHeight
    
    // Calculate costs for different quantities
    const formulaCost = quoteData.formulaCost * quoteData.productSize
    const mfg100 = getManufacturingFee(100, quoteData.selectedProduct || undefined)
    const mfg500 = getManufacturingFee(500, quoteData.selectedProduct || undefined)
    const mfg1000 = getManufacturingFee(1000, quoteData.selectedProduct || undefined)
    const label100 = quoteData.isClientLabel ? 0 : getLabelCost(100, quoteData.selectedProduct || undefined)
    const label500 = quoteData.isClientLabel ? 0 : getLabelCost(500, quoteData.selectedProduct || undefined)
    const label1000 = quoteData.isClientLabel ? 0 : getLabelCost(1000, quoteData.selectedProduct || undefined)
    const packaging = quoteData.isClientPackaging ? 0 : quoteData.packagingCost
    
    // Table rows
    const tableData = [
      ['Formula', formulaCost.toFixed(2), formulaCost.toFixed(2), formulaCost.toFixed(2)],
      ['Manufacturing', mfg100.toFixed(2), mfg500.toFixed(2), mfg1000.toFixed(2)],
      ['Labels', label100.toFixed(2), label500.toFixed(2), label1000.toFixed(2)],
      ['Packaging', packaging.toFixed(2), packaging.toFixed(2), packaging.toFixed(2)]
    ]
    
    pdf.setFont(undefined, 'normal')
    tableData.forEach((row) => {
      pdf.rect(20, currentY - 3, 170, rowHeight, 'S')
      pdf.text(row[0], 22, currentY + 2)
      pdf.text(`$${row[1]}`, 102, currentY + 2)
      pdf.text(`$${row[2]}`, 132, currentY + 2)
      pdf.text(`$${row[3]}`, 162, currentY + 2)
      currentY += rowHeight
    })
    
    // Total row
    pdf.setFillColor(240, 240, 240)
    pdf.rect(20, currentY - 3, 170, rowHeight, 'F')
    pdf.rect(20, currentY - 3, 170, rowHeight, 'S')
    
    pdf.setFont(undefined, 'bold')
    pdf.text('TOTAL (before tax/shipping)', 22, currentY + 2)
    const total100 = formulaCost + mfg100 + label100 + packaging
    const total500 = formulaCost + mfg500 + label500 + packaging
    const total1000 = formulaCost + mfg1000 + label1000 + packaging
    
    pdf.text(`$${total100.toFixed(2)}`, 102, currentY + 2)
    pdf.text(`$${total500.toFixed(2)}`, 132, currentY + 2) 
    pdf.text(`$${total1000.toFixed(2)}`, 162, currentY + 2)
    
    currentY += 8
    pdf.setFontSize(8)
    pdf.setFont(undefined, 'italic')
    pdf.text('*This quote is valid for 30 days from the date of issue.', 20, currentY)
    
    // 3. Timeline Estimate
    currentY += 15
    pdf.setFontSize(16)
    pdf.setFont(undefined, 'bold')
    pdf.setTextColor(21, 80, 100)
    pdf.text('3. Timeline Estimate', 20, currentY)
    
    currentY += 10
    const timelineData = [
      ['Formula Development', '2–4 weeks'],
      ['Sampling & Approval', '1–2 weeks (up to 3 revisions)'],
      ['Production', '3–6 weeks post-approval'],
      ['Fulfillment & Shipping', '1 week (depending on location)']
    ]
    
    pdf.setFontSize(10)
    pdf.setFont(undefined, 'normal')
    pdf.setTextColor(0, 0, 0)
    
    timelineData.forEach(([phase, duration]) => {
      pdf.rect(20, currentY - 3, 85, rowHeight, 'S')
      pdf.rect(105, currentY - 3, 85, rowHeight, 'S')
      pdf.text(phase, 22, currentY + 2)
      pdf.text(duration, 107, currentY + 2)
      currentY += rowHeight
    })
    
    // Check if we need a new page
    if (currentY > pageHeight - 60) {
      pdf.addPage()
      currentY = 20
    } else {
      currentY += 30
    }
    
    // 4. Terms & Conditions
    pdf.setFontSize(16)
    pdf.setFont(undefined, 'bold')
    pdf.setTextColor(21, 80, 100)
    pdf.text('4. Terms & Conditions', 20, currentY)
    
    currentY += 10
    
    // Payment Terms
    pdf.setFontSize(12)
    pdf.setFont(undefined, 'bold')
    pdf.setTextColor(0, 0, 0)
    pdf.text('Payment Terms', 20, currentY)
    currentY += 6
    
    pdf.setFontSize(10)
    pdf.setFont(undefined, 'normal')
    const paymentTerms = [
      '• 50% deposit due upon acceptance of quote',
      '• 50% balance due prior to shipment',
      '• Payments via Check, Credit Card'
    ]
    paymentTerms.forEach(term => {
      pdf.text(term, 20, currentY)
      currentY += 6
    })
    
    currentY += 6
    
    // Ownership
    pdf.setFontSize(12)
    pdf.setFont(undefined, 'bold')
    pdf.text('Ownership', 20, currentY)
    currentY += 6
    
    pdf.setFontSize(10)
    pdf.setFont(undefined, 'normal')
    const ownershipTerms = [
      '• Custom formulas are proprietary to PurOlea until full payment is received',
      '• Upon final payment, client receives rights to the final formula (not base formula or lab process)'
    ]
    ownershipTerms.forEach(term => {
      const lines = pdf.splitTextToSize(term, 170)
      lines.forEach((line: string) => {
        pdf.text(line, 20, currentY)
        currentY += 6
      })
    })
    
    currentY += 6
    
    // Confidentiality
    pdf.setFontSize(12)
    pdf.setFont(undefined, 'bold')
    pdf.text('Confidentiality', 20, currentY)
    currentY += 6
    
    pdf.setFontSize(10)
    pdf.setFont(undefined, 'normal')
    const confidentialityText = 'Both parties agree to treat proprietary and business information shared during this engagement as strictly confidential.'
    const confLines = pdf.splitTextToSize(confidentialityText, 170)
    confLines.forEach((line: string) => {
      pdf.text(line, 20, currentY)
      currentY += 6
    })
    
    currentY += 6
    
    // Refunds / Revisions
    pdf.setFontSize(12)
    pdf.setFont(undefined, 'bold')
    pdf.text('Refunds / Revisions', 20, currentY)
    currentY += 6
    
    pdf.setFontSize(10)
    pdf.setFont(undefined, 'normal')
    const refundTerms = [
      '• Formulation fees are non-refundable after development begins',
      '• Up to 3 formula revisions included. Additional revisions: $X each',
      '• In case of cancellation after production has started, client will be invoiced for raw materials and labor already incurred'
    ]
    refundTerms.forEach(term => {
      const lines = pdf.splitTextToSize(term, 170)
      lines.forEach((line: string) => {
        pdf.text(line, 20, currentY)
        currentY += 6
      })
    })
    
    currentY += 6
    
    // Minimum Order Quantities
    pdf.setFontSize(12)
    pdf.setFont(undefined, 'bold')
    pdf.text('Minimum Order Quantities (MOQ)', 20, currentY)
    currentY += 6
    
    pdf.setFontSize(10)
    pdf.setFont(undefined, 'normal')
    const moqText = 'Custom manufacturing MOQs are subject to ingredient and packaging availability. Standard MOQ: 500 units per SKU.'
    const moqLines = pdf.splitTextToSize(moqText, 170)
    moqLines.forEach((line: string) => {
      pdf.text(line, 20, currentY)
      currentY += 6
    })
    
    // Check if we need a new page for signatures
    if (currentY > pageHeight - 80) {
      pdf.addPage()
      currentY = 20
    } else {
      currentY += 10
    }
    
    // 5. Acceptance & Signature
    pdf.setFontSize(16)
    pdf.setFont(undefined, 'bold')
    pdf.setTextColor(21, 80, 100)
    pdf.text('5. Acceptance & Signature', 20, currentY)
    
    currentY += 10
    pdf.setFontSize(10)
    pdf.setFont(undefined, 'normal')
    pdf.setTextColor(0, 0, 0)
    const acceptanceText = 'By signing below, you agree to the terms outlined above and confirm your intention to proceed with PurOlea Cosmetics Lab.'
    const acceptanceLines = pdf.splitTextToSize(acceptanceText, 170)
    acceptanceLines.forEach((line: string) => {
      pdf.text(line, 20, currentY)
      currentY += 6
    })
    
    currentY += 8
    
    // Client signature section
    pdf.setFont(undefined, 'bold')
    pdf.text('Client Name:', 20, currentY)
    pdf.line(55, currentY, 120, currentY)
    
    currentY += 6
    pdf.text('Signature:', 20, currentY)
    pdf.line(50, currentY, 120, currentY)
    
    currentY += 6
    pdf.text('Date:', 20, currentY)
    pdf.line(40, currentY, 80, currentY)
    
    currentY += 10
    
    // PurOlea signature section
    pdf.text('PurOlea Authorized Representative:', 20, currentY)
    currentY += 8
    pdf.text('Name: Maria Mattina', 20, currentY)
    
    currentY += 6
    pdf.text('Signature:', 20, currentY)
    pdf.line(50, currentY, 120, currentY)
    
    currentY += 6
    pdf.text('Date:', 20, currentY)
    pdf.line(40, currentY, 80, currentY)
    
    return pdf.output('blob')
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
    // Allow saving if either a product is selected OR we're in n8n mode
    if (!quoteData.selectedProduct && !isN8nProductSelected) {
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

    // Start loading state
    setIsProcessingOrder(true)

    try {
      let productName = 'Unknown Product'
      if (isN8nProductSelected) {
        productName = n8nProductName
      } else {
        const selectedProduct = products.find(p => p.id === quoteData.selectedProduct)
        productName = selectedProduct ? selectedProduct.name : 'Unknown Product'
      }

      // Generate comprehensive PDF
      const pdfBlob = await generateOrderPDFFile(modalClientName)
      
      // Create filename using client name (sanitized for file system)
      const sanitizedClientName = modalClientName.replace(/[^a-zA-Z0-9\s]/g, '_')
      const timestamp = Date.now()
      const fileName = `${sanitizedClientName}_quote_${timestamp}.pdf`
      
      // Check if bucket exists and list buckets for debugging
      try {
        const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
        if (bucketsError) {
          console.error('Error listing buckets:', bucketsError)
        } else {
          console.log('Available buckets:', buckets?.map(b => b.name))
        }
      } catch (e) {
        console.log('Could not list buckets:', e)
      }
      
      // Upload PDF to Supabase Storage 
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('quotes')
        .upload(`pdfs/${fileName}`, pdfBlob, {
          contentType: 'application/pdf',
          upsert: false
        })

      if (uploadError) {
        console.error('Error uploading PDF:', uploadError)
        console.error('Upload error details:', uploadError)
        
        // If bucket doesn't exist, provide helpful error message
        if (uploadError.message?.includes('Bucket not found')) {
          throw new Error('Storage bucket "quotes" not found. Please create it in your Supabase dashboard under Storage > New Bucket.')
        }
        
        // If RLS policy blocks upload
        if (uploadError.message?.includes('row-level security policy') || uploadError.statusCode === '403') {
          throw new Error('Permission denied: Storage policies needed. Go to Supabase Dashboard → Storage → quotes bucket → Policies → New Policy (allow INSERT for authenticated users).')
        }
        
        throw new Error(`Failed to upload PDF to storage: ${uploadError.message}`)
      }

      // Save quote to database
      await createQuoteMutation.mutateAsync({
        // product_id: quoteData.selectedProduct || null, // Allow null for n8n mode
        product_name: productName, // Add n8n product name
        quantity: quoteData.quantity,
        formula_cost: costs.formulaCostPerUnit,
        packaging_cost: costs.packagingCostPerUnit,
        label_cost: costs.labelCostPerUnit,
        manufacturing_fee: costs.manufacturingFeePerUnit,
        total_unit_cost: costs.totalUnitCost,
        client_name: modalClientName,
        client_email: modalClientEmail,
        pdf_upload: fileName,
        created_by: 'maria@purolea.com'
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
        description: "Quote ordered and comprehensive PDF generated successfully!",
        variant: "default"
      })

      // console.log('Comprehensive PDF uploaded successfully to:', uploadData.path)
    } catch (error) {
      // console.error('Error saving quote:', error)
      
      let errorMessage = "Failed to save quote. Please try again."
      
      // Handle specific error types
      if (error instanceof Error) {
        if (error.message.includes('PDF') || error.message.includes('upload')) {
          errorMessage = "Failed to generate or save PDF. Please try again."
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = "Network error. Please check your connection and try again."
        } else if (error.message.includes('validation') || error.message.includes('invalid')) {
          errorMessage = "Invalid data provided. Please check all fields and try again."
        } else if (error.message.includes('duplicate') || error.message.includes('unique')) {
          errorMessage = "A quote with similar details already exists."
        } else if (error.message.includes('permission') || error.message.includes('unauthorized')) {
          errorMessage = "You don't have permission to save quotes. Please contact support."
        } else if (error.message) {
          errorMessage = `Error: ${error.message}`
        }
      }
      
      toast({
        title: "Failed to Save Quote",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      // Always clear loading state regardless of success or failure
      setIsProcessingOrder(false)
    }
  }

  const handleCancelModal = () => {
    setShowConfirmModal(false)
    setModalClientName("")
    setModalClientEmail("")
    setEmailError("")
  }

  

  // Send PDF file to n8n webhook
  const sendPDFToN8n = async (file: File) => {
    setIsUploadingToN8n(true)
    try {
      // Convert file to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        // console.log(reader);
        reader.onload = () => {
          const result = reader.result as string
          // Remove the data URL prefix (data:application/pdf;base64,)
          const base64Data = result.split(',')[1]
          resolve(base64Data)
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      // Prepare simple payload with just the PDF file
      const payload = {
        file: {
          name: file.name,
          size: file.size,
          type: file.type,
          base64: base64,
          uploadedAt: new Date().toISOString()
        }
      }

      // console.log("waiting...");

      // Send to n8n webhook
      const response = await fetch('https://n8n.srv822548.hstgr.cloud/webhook/ai-pdf-extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json();
      // console.log('n8n webhook response:', result);

      // Process n8n response and auto-populate fields
      if (result && result.name && result.volume && result.unitcost) {
        handleN8nResponse(result)
        toast({
          title: "File processed successfully",
          description: `Extracted: ${result.name} (${result.volume}oz, $${result.unitcost})`,
          variant: "default"
        })
      } else {
        // Reset n8n state if response doesn't contain valid data
        resetN8nState()
        toast({
          title: "File processed",
          description: "Could not extract product data from PDF. Please fill in manually.",
          variant: "default"
        })
      }

    } catch (error) {
      // console.error('Error sending file to n8n:', error)
      // Reset n8n state on failure
      resetN8nState()
      toast({
        title: "Error processing file",
        description: "Failed to process PDF with n8n. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsUploadingToN8n(false)
    }
  }

  // File upload handlers
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (file.type !== 'application/pdf') {
      setFileError("Please select a PDF file")
      setUploadedFile(null)
      // Reset the input value
      event.target.value = ''
      toast({
        title: "Invalid file type",
        description: "Please select a PDF file",
        variant: "destructive"
      })
      return
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB in bytes
    if (file.size > maxSize) {
      setFileError("File size must be less than 10MB")
      setUploadedFile(null)
      // Reset the input value
      event.target.value = ''
      toast({
        title: "File too large",
        description: "File size must be less than 10MB",
        variant: "destructive"
      })
      return
    }

    setFileError("")
    setUploadedFile(file)
    
    toast({
      title: "File uploaded successfully",
      description: `${file.name} is being processed...`,
      variant: "default"
    })

    // Send PDF file to n8n
    await sendPDFToN8n(file)
    
    // Reset the input value to allow uploading the same file again
    event.target.value = ''
  }

  const handleRemoveFile = () => {
    setUploadedFile(null)
    setFileError("")
    // Reset n8n state when file is removed
    resetN8nState()
    // Reset the file input value
    const fileInput = document.getElementById('pdf-upload') as HTMLInputElement
    if (fileInput) {
      fileInput.value = ''
    }
    toast({
      title: "File removed",
      description: "Uploaded file has been removed",
      variant: "default"
    })
  }

  // const generatePDF = () => {
  //   // Check if we have either a selected product or n8n mode active
  //   if (!quoteData.selectedProduct && !isN8nProductSelected) {
  //     toast({
  //       title: "Error",
  //       description: "Please select a product first",
  //       variant: "destructive"
  //     })
  //     return
  //   }

  //   // Simple print-friendly version
  //   const printWindow = window.open('', '_blank')
  //   if (!printWindow) return

  //   // Get the product name - either from n8n or selected product
  //   let productName = 'Unknown Product'
  //   if (isN8nProductSelected) {
  //     productName = n8nProductName
  //   } else {
  //     const selectedProduct = products.find(p => p.id === quoteData.selectedProduct)
  //     productName = selectedProduct ? selectedProduct.name : 'Unknown Product'
  //   }

  //   const htmlContent = `
  //     <!DOCTYPE html>
  //     <html>
  //       <head>
  //         <title>Purolea Quote - ${productName} - ${new Date().toLocaleDateString()}</title>
  //         <style>
  //           body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
  //           .header { text-align: center; margin-bottom: 30px; }
  //           .section { margin-bottom: 20px; }
  //           table { width: 100%; border-collapse: collapse; margin: 20px 0; }
  //           th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
  //           th { background-color: #f5f5f5; font-weight: bold; }
  //           .total { font-weight: bold; background-color: #f0f0f0; }
  //           .notes { background-color: #f9f9f9; padding: 15px; border-left: 4px solid #ccc; }
  //         </style>
  //       </head>
  //       <body>
  //         <div class="header">
  //           <h1>Purolea Production Quote</h1>
  //           <h2>${productName}</h2>
  //           <p>Generated on ${new Date().toLocaleDateString()}</p>
  //         </div>
          
  //         <div class="section">
  //           <h3>Product Specifications</h3>
  //           <p><strong>Product Name:</strong> ${productName}</p>
  //           <p><strong>Formula Cost:</strong> $${(Number(quoteData.formulaCost) || 0).toFixed(2)} per oz</p>
  //           <p><strong>Product Size:</strong> ${Number(quoteData.productSize) || 0} oz</p>
  //           <p><strong>Production Quantity:</strong> ${Number(quoteData.quantity) || 0} units</p>
  //           <p><strong>Packaging:</strong> ${quoteData.isClientPackaging ? 'Client Provided' : '$' + (Number(quoteData.packagingCost) || 0).toFixed(2) + ' per unit'}</p>
  //           <p><strong>Labels:</strong> ${quoteData.isClientLabel ? 'Client Provided' : '$' + (Number(costs.labelCostPerUnit) || 0).toFixed(2) + ' per unit'}</p>
  //         </div>

  //         <table>
  //           <tr><th>Cost Component</th><th>Per Unit</th><th>Total (${Number(quoteData.quantity) || 0} units)</th></tr>
  //           <tr><td>🧪 Formula Cost</td><td>$${(Number(costs.formulaCostPerUnit) || 0).toFixed(2)}</td><td>$${((Number(costs.formulaCostPerUnit) || 0) * (Number(quoteData.quantity) || 0)).toFixed(2)}</td></tr>
  //           <tr><td>📦 Packaging</td><td>$${(Number(costs.packagingCostPerUnit) || 0).toFixed(2)}</td><td>$${((Number(costs.packagingCostPerUnit) || 0) * (Number(quoteData.quantity) || 0)).toFixed(2)}</td></tr>
  //           <tr><td>🏷️ Label Printing</td><td>$${(Number(costs.labelCostPerUnit) || 0).toFixed(2)}</td><td>$${((Number(costs.labelCostPerUnit) || 0) * (Number(quoteData.quantity) || 0)).toFixed(2)}</td></tr>
  //           <tr><td>🏭 Manufacturing</td><td>$${(Number(costs.manufacturingFeePerUnit) || 0).toFixed(2)}</td><td>$${((Number(costs.manufacturingFeePerUnit) || 0) * (Number(quoteData.quantity) || 0)).toFixed(2)}</td></tr>
  //           <tr class="total"><td><strong>Total</strong></td><td><strong>$${(Number(costs.totalUnitCost) || 0).toFixed(2)}</strong></td><td><strong>$${(Number(costs.totalProjectCost) || 0).toFixed(2)}</strong></td></tr>
  //         </table>

  //         ${quoteData.notes ? `<div class="notes"><h4>Notes:</h4><p>${quoteData.notes}</p></div>` : ''}
          
  //         <div class="section">
  //           <p><small>Lead time: 3–4 weeks from order confirmation</small></p>
  //         </div>
  //       </body>
  //     </html>
  //   `
    
  //   printWindow.document.write(htmlContent)
  //   printWindow.document.close()
  //   printWindow.focus()
  //   setTimeout(() => printWindow.print(), 100)
  // }

  const generatePDF = () => {
  // Check product selection
  if (!quoteData.selectedProduct && !isN8nProductSelected) {
    toast({
      title: "Error",
      description: "Please select a product first",
      variant: "destructive"
    })
    return
  }

  // Open print window
  const printWindow = window.open('', '_blank')
  if (!printWindow) return

  // Determine product name
  let productName = 'Unknown Product'
  if (isN8nProductSelected) {
    productName = n8nProductName
  } else {
    const selectedProduct = products.find(p => p.id === quoteData.selectedProduct)
    productName = selectedProduct ? selectedProduct.name : 'Unknown Product'
  }

  const quantity = Number(quoteData.quantity) || 0

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
    <meta charset="UTF-8">
    <title>PurOlea Quote & Contract</title>
    <style>
      @page { size: A4; margin: 15mm; }
      body { font-family: 'Arial', sans-serif; margin: 0; color: #333; line-height: 1.5; }
      .page { page-break-after: always; padding: 15mm; }

      h1, h2, h3 { margin: 0 0 10px; }
      h1 { text-align: center; font-size: 24px; text-transform: uppercase; color: #155064 }
      h2 { text-align: center; font-size: 16px; font-weight: normal; }
      h3 { font-size: 14px; font-weight: normal; }
      

      .section { margin-top: 20px; }
      .section-title { font-weight: bold; margin: 15px 0 5px; font-size: 16px; color: #155064}

      table { width: 100%; border-collapse: collapse; margin-top: 8px; }
      th, td { border: 1px solid #000; padding: 6px 8px; font-size: 13px; }
      th { background-color: #f0f0f0; text-align: left; }
      .center { text-align: center; }

      .timeline-table td { width: 50%; }

      .signature-block { margin-top: 30px; font-size: 13px; }
      .signature-line { display: block; margin-top: 40px; border-top: 1px solid #000; width: 220px; }
      .flex-signatures { display: block; justify-content: space-between; margin-top: 20px; }
    </style>
    </head>
    <body>

    <div class="page">
      <h1>PurOlea Quote & Contract</h1>
      <h2>Prepared for: <strong>LET’S TALK TALLO</strong></h2>
      <h2><strong>Contract Manufacturing & Formulation Services</strong></h2>

      <div class="section">
        
        <p>Contact: Maria Martina (+1 734 564 4885)</p>
      </div>

      <div class="section">
        <div class="section-title"><strong>1. Project Scope</strong></div>
        <p><strong>Product(s):</strong></p>
        <ul>
          <li><strong>Name(s):</strong> ${productName}</li>
          <li><strong>Size(s):</strong> ${quoteData.productSize}oz</li>
        </ul>

        <p><strong>Services Included:</strong></p>
        <ul>
          <li>Contract Manufacturing</li>
        </ul>
      </div>

      <div class="section">
        <div class="section-title"><strong>2. Quote Summary</strong></div>
        <table>
          <thead>
            <tr>
              <th>Item/Qty</th>
              <th>100</th>
              <th>500</th>
              <th>1000</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>🧪 Formula</td><td>$${(quoteData.formulaCost * quoteData.productSize).toFixed(2)}</td><td>$${(quoteData.formulaCost * quoteData.productSize).toFixed(2)}</td><td>$${(quoteData.formulaCost * quoteData.productSize).toFixed(2)}</td></tr>
            <tr><td>🏭 Manufacturing</td><td>$${getManufacturingFee(100, quoteData.selectedProduct || undefined).toFixed(2)}</td><td>$${getManufacturingFee(500, quoteData.selectedProduct || undefined).toFixed(2)}</td><td>$${getManufacturingFee(1000, quoteData.selectedProduct || undefined).toFixed(2)}</td></tr>
            <tr><td>🏷️ Labels</td><td>$${quoteData.isClientLabel ? '0.00' : getLabelCost(100, quoteData.selectedProduct || undefined).toFixed(2)}</td><td>$${quoteData.isClientLabel ? '0.00' : getLabelCost(500, quoteData.selectedProduct || undefined).toFixed(2)}</td><td>$${quoteData.isClientLabel ? '0.00' : getLabelCost(1000, quoteData.selectedProduct || undefined).toFixed(2)}</td></tr>
            <tr><td>📦 Packaging</td><td>$${quoteData.isClientPackaging ? '0.00' : quoteData.packagingCost.toFixed(2)}</td><td>$${quoteData.isClientPackaging ? '0.00' : quoteData.packagingCost.toFixed(2)}</td><td>$${quoteData.isClientPackaging ? '0.00' : quoteData.packagingCost.toFixed(2)}</td></tr>
            <tr><td><strong>TOTAL (before tax/shipping)</strong></td><td><strong>$${((quoteData.formulaCost * quoteData.productSize) + getManufacturingFee(100, quoteData.selectedProduct || undefined) + (quoteData.isClientLabel ? 0 : getLabelCost(100, quoteData.selectedProduct || undefined)) + (quoteData.isClientPackaging ? 0 : quoteData.packagingCost)).toFixed(2)}</strong></td><td><strong>$${((quoteData.formulaCost * quoteData.productSize) + getManufacturingFee(500, quoteData.selectedProduct || undefined) + (quoteData.isClientLabel ? 0 : getLabelCost(500, quoteData.selectedProduct || undefined)) + (quoteData.isClientPackaging ? 0 : quoteData.packagingCost)).toFixed(2)}</strong></td><td><strong>$${((quoteData.formulaCost * quoteData.productSize) + getManufacturingFee(1000, quoteData.selectedProduct || undefined) + (quoteData.isClientLabel ? 0 : getLabelCost(1000, quoteData.selectedProduct || undefined)) + (quoteData.isClientPackaging ? 0 : quoteData.packagingCost)).toFixed(2)}</strong></td></tr>
          </tbody>
        </table>
        <p style="margin-top: 5px; font-size: 12px;"><em>*This quote is valid for 30 days from the date of issue.*</em></p>
      </div>

      <div class="section">
        <div class="section-title"><strong>3. Timeline Estimate</strong></div>
        <table class="timeline-table">
          <tbody>
            <tr><td>Formula Development</td><td>2–4 weeks</td></tr>
            <tr><td>Sampling & Approval</td><td>1–2 weeks (up to 3 revisions)</td></tr>
            <tr><td>Production</td><td>3–6 weeks post-approval</td></tr>
            <tr><td>Fulfillment & Shipping</td><td>1 week (depending on location)</td></tr>
          </tbody>
        </table>
      </div>
      <br><br><br><br>
      <div class="section">
        <div class="section-title"><strong>4. Terms & Conditions</strong></div>
        
        <h3><strong>Payment Terms</strong></h3>
        <ul>
          <li>50% deposit due upon acceptance of quote</li>
          <li>50% balance due prior to shipment</li>
          <li>Payments via Check, Credit Card</li>
        </ul>

        <h3><strong>Ownership</strong></h3>
        <ul>
          <li>Custom formulas are proprietary to PurOlea until full payment is received</li>
          <li>Upon final payment, client receives rights to the final formula (not base formula or lab process)</li>
        </ul>

        <h3><strong>Confidentiality</strong></h3>
        <p>Both parties agree to treat proprietary and business information shared during this engagement as strictly confidential.</p>

        <h3><strong>Refunds / Revisions</strong></h3>
        <ul>
          <li>Formulation fees are non-refundable after development begins</li>
          <li>Up to 3 formula revisions included. Additional revisions: $X each</li>
          <li>In case of cancellation after production has started, client will be invoiced for raw materials and labor already incurred</li>
        </ul>

        <h3><strong>Minimum Order Quantities (MOQ)</strong></h3>
        <p>Custom manufacturing MOQs are subject to ingredient and packaging availability. Standard MOQ: 500 units per SKU.</p>
      </div>

      <div class="section">
        <div class="section-title"><strong>5. Acceptance & Signature</strong></div>
        <p>By signing below, you agree to the terms outlined above and confirm your intention to proceed with PurOlea Cosmetics Lab.</p>

        <div class="flex-signatures">
          <div>
            <strong>Client Name:</strong> _______________________<br>
            <strong>Signature:</strong>_________________________<br>
            <strong>Date:</strong> _____________________________
          </div>
          <br>
          <div>
            <strong>PurOlea Authorized Representative:</strong><br>
            <strong>Name: Maria Mattina</strong><br>
            <strong>Signature:</strong> _________________________<br>
            <strong>Date:</strong> _____________________________
          </div>
        </div>
      </div>
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

            {/* Upload Button in Header */}
            <div className="flex items-center gap-3">
              {uploadedFile && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {isUploadingToN8n ? (
                    <Loader2 className="h-4 w-4 text-primary animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4 text-primary" />
                  )}
                  <span className="max-w-32 truncate">
                    {uploadedFile.name}
                    {isUploadingToN8n && <span className="text-xs ml-1">(processing...)</span>}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveFile}
                    className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
                    disabled={isUploadingToN8n}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
              <Button
                variant="elegant"
                size="sm"
                onClick={() => document.getElementById('pdf-upload')?.click()}
                className="text-xs"
                disabled={isUploadingToN8n}
              >
                {isUploadingToN8n ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Upload className="h-3 w-3 mr-1" />
                )}
                {isUploadingToN8n ? 'Processing...' : (uploadedFile ? 'Replace PDF' : 'Upload PDF')}
              </Button>
              <input
                id="pdf-upload"
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileUpload}
                className="hidden"
              />
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
                    <div className="flex items-center justify-between">
                      <Label htmlFor="product" className="text-sm">
                        {isN8nProductSelected ? "Product from PDF" : "Select Product Type"}
                      </Label>
                      {isN8nProductSelected && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={resetN8nState}
                          className="h-6 text-xs text-muted-foreground hover:text-foreground"
                        >
                          Reset
                        </Button>
                      )}
                    </div>
                    
                    {isN8nProductSelected ? (
                      <Input
                        value={n8nProductName}
                        readOnly
                        className="mt-1 bg-muted"
                        placeholder="Product name from PDF"
                      />
                    ) : (
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
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="formulaCost" className="text-sm">Formula Cost (per oz)</Label>
                      <Input
                        id="formulaCost"
                        type="number"
                        step="0.01"
                        value={(Number(quoteData.formulaCost) || 0).toFixed(2)}
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
                      disabled={createQuoteMutation.isPending || productsLoading || (!quoteData.selectedProduct && !isN8nProductSelected)}
                      variant="default" 
                      size="sm"
                      className="w-full text-xs"
                    >
                      <ShoppingCart className="h-3 w-3" />
                      {createQuoteMutation.isPending ? 'Saving...' : 'Save Quote'}
                    </Button>
                    <Button 
                      onClick={generatePDF} 
                      disabled={!quoteData.selectedProduct && !isN8nProductSelected}
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
      <Dialog 
        open={showConfirmModal} 
        onOpenChange={(open) => {
          // Prevent closing modal during processing
          if (!isProcessingOrder) {
            setShowConfirmModal(open)
          }
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Quote Order</DialogTitle>
            <DialogDescription>
              Please provide client information to save this quote.
            </DialogDescription>
          </DialogHeader>
          
          {/* Loading State Indicator */}
          {isProcessingOrder && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                <div className="text-sm text-blue-800">
                  <div className="font-medium">Processing your order...</div>
                  <div className="text-xs text-blue-600 mt-1">
                    Generating comprehensive PDF contract and uploading to secure storage
                  </div>
                </div>
              </div>
            </div>
          )}
          
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
                disabled={isProcessingOrder}
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
                  disabled={isProcessingOrder}
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
              disabled={isProcessingOrder || !modalClientName || !modalClientEmail || !!emailError}
              className="min-w-[120px]"
            >
              {isProcessingOrder ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Processing...</span>
                </div>
              ) : (
                'Order'
              )}
            </Button>
            <Button 
              variant="outline" 
              onClick={handleCancelModal}
              disabled={isProcessingOrder}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default QuoteCalculator