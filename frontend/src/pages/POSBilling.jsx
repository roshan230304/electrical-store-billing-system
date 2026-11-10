import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/formatters';
import InvoicePreviewModal from '../components/invoice/InvoicePreviewModal';
import {
  Search, Plus, Minus, Trash2, PauseCircle, PlayCircle,
  CreditCard, Wallet, QrCode, Split, CheckCircle2, UserCheck, X,
  Printer, ArrowLeft, RefreshCw, ShoppingCart, AlertCircle, Sparkles,
  Phone, UserPlus, Gift, Star, Award
} from 'lucide-react';

const money = value => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
const DECIMAL_UNITS = new Set([
  'm', 'meter', 'meters', 'metre', 'metres', 'mtr',
  'kg', 'kilogram', 'kilograms', 'g', 'gram', 'grams',
  'l', 'liter', 'litre', 'liters', 'litres'
]);
const allowsFractionalQuantity = unit => DECIMAL_UNITS.has(String(unit || 'Piece').trim().toLowerCase());
const STATE_NAMES_BY_GST_CODE = {
  '01': 'Jammu and Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab', '04': 'Chandigarh',
  '05': 'Uttarakhand', '06': 'Haryana', '07': 'Delhi', '08': 'Rajasthan',
  '09': 'Uttar Pradesh', '10': 'Bihar', '11': 'Sikkim', '12': 'Arunachal Pradesh',
  '13': 'Nagaland', '14': 'Manipur', '15': 'Mizoram', '16': 'Tripura',
  '17': 'Meghalaya', '18': 'Assam', '19': 'West Bengal', '20': 'Jharkhand',
  '21': 'Odisha', '22': 'Chhattisgarh', '23': 'Madhya Pradesh', '24': 'Gujarat',
  '26': 'Dadra and Nagar Haveli and Daman and Diu', '27': 'Maharashtra',
  '29': 'Karnataka', '30': 'Goa', '31': 'Lakshadweep', '32': 'Kerala',
  '33': 'Tamil Nadu', '34': 'Puducherry', '35': 'Andaman and Nicobar Islands',
  '36': 'Telangana', '37': 'Andhra Pradesh', '38': 'Ladakh'
};

export default function POSBilling() {
  const navigate = useNavigate();
  const { business } = useAuth();
  const checkoutKeyRef = useRef(null);
  const customerLookupRef = useRef(0);

  // State: Products & Categories
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchingProducts, setSearchingProducts] = useState(false);
  const [highlightedProductIndex, setHighlightedProductIndex] = useState(0);
  const [cartFeedback, setCartFeedback] = useState(null);

  // State: Customer & Loyalty Points
  const [parties, setParties] = useState([]);
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedPartyId, setSelectedPartyId] = useState(null);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [customerExists, setCustomerExists] = useState(false);
  const [customerLookupMessage, setCustomerLookupMessage] = useState('');
  const [isLookingUpPhone, setIsLookingUpPhone] = useState(false);
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [redeemPoints, setRedeemPoints] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);

  // State: Billing calculations & Payment
  const [billDiscountPercent, setBillDiscountPercent] = useState(0);
  const [paymentType, setPaymentType] = useState('Cash'); // Cash, UPI, Card, Split
  const [paymentAmounts, setPaymentAmounts] = useState({
    Cash: '', UPI: '', Card: '', 'Bank Transfer': ''
  });
  const [cashTendered, setCashTendered] = useState('');
  const [stateOfSupply, setStateOfSupply] = useState('Karnataka');
  const [notes, setNotes] = useState('');

  // State: Held bills
  const [heldBills, setHeldBills] = useState([]);
  const [showHeldModal, setShowHeldModal] = useState(false);

  // State: Checkout & Post-checkout Success Modal
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedSale, setCompletedSale] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(null); // Holds { invoice_number, phone_number, grand_total, points_earned, points_redeemed, remaining_points, received_amount }

  const searchInputRef = useRef(null);
  const initialSearchFocusDone = useRef(false);

  // Load products, categories, parties, and held bills
  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (!loading && !initialSearchFocusDone.current) {
      initialSearchFocusDone.current = true;
      searchInputRef.current?.focus();
    }
  }, [loading]);

  useEffect(() => {
    setHighlightedProductIndex(0);
  }, [searchTerm, selectedCategory]);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      try {
        setSearchingProducts(true);
        const result = await api.getItems(searchTerm.trim(), '', 'Product');
        if (active && result.success) setProducts(result.data || []);
      } catch (error) {
        if (active) setCartFeedback({ type: 'error', text: `Product search failed: ${error.message}` });
      } finally {
        if (active) setSearchingProducts(false);
      }
    }, searchTerm.trim() ? 250 : 0);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [searchTerm]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [catRes, partyRes, heldRes] = await Promise.all([
        api.getCategories(),
        api.getParties('', 'Customer'),
        api.getHeldBills()
      ]);

      if (catRes.success) setCategories(catRes.data || []);
      if (partyRes.success) setParties(partyRes.data || []);
      if (heldRes.success) setHeldBills(heldRes.data || []);
    } catch (err) {
      console.error('Error loading POS data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Keyboard shortcuts (F4 for cash, F8 to hold, F9 to checkout)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)
        && document.activeElement !== searchInputRef.current) return;
      if (e.key === 'F4') {
        e.preventDefault();
        setPaymentType('Cash');
      } else if (e.key === 'F8') {
        e.preventDefault();
        handleHoldBill();
      } else if (e.key === 'F9') {
        e.preventDefault();
        handleCompleteSale();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    cart, customerName, customerPhone, paymentType, cashTendered, paymentAmounts,
    billDiscountPercent, stateOfSupply, isRedeeming, redeemPoints
  ]);

  // Lookup customer by phone number
  const lookupCustomerByPhone = async (phoneToLookup) => {
    const phone = String(phoneToLookup !== undefined ? phoneToLookup : customerPhone).trim();
    if (!phone) {
      setCustomerExists(false);
      setSelectedPartyId(null);
      setLoyaltyPoints(0);
      setIsRedeeming(false);
      setRedeemPoints('');
      setCustomerLookupMessage('Customer phone number is required.');
      return;
    }

    const lookupId = ++customerLookupRef.current;
    try {
      setIsLookingUpPhone(true);
      const result = await api.getCustomerByPhone(phone);
      if (lookupId !== customerLookupRef.current) return;
      if (result.success && result.data) {
        setCustomerName(result.data.name);
        setSelectedPartyId(result.data.id);
        setLoyaltyPoints(Number(result.data.loyalty_points || 0));
        const customerGstState = STATE_NAMES_BY_GST_CODE[String(result.data.gst_number || '').slice(0, 2)];
        if (customerGstState) setStateOfSupply(customerGstState);
        setCustomerExists(true);
        setCustomerLookupMessage(`Registered Customer: ${result.data.name}`);
      } else if (result.message?.includes('No customer found')) {
        setCustomerName(current => (current === 'Walk-in Customer' || customerExists) ? '' : current);
        setSelectedPartyId(null);
        setLoyaltyPoints(0);
        setIsRedeeming(false);
        setCustomerExists(false);
        setCustomerLookupMessage('New Customer — enter name to register');
      } else {
        setCustomerLookupMessage(result.message || 'Customer lookup failed. Please retry.');
      }
    } catch (error) {
      if (lookupId === customerLookupRef.current) {
        setCustomerLookupMessage(`Lookup: ${error.message}`);
      }
    } finally {
      if (lookupId === customerLookupRef.current) setIsLookingUpPhone(false);
    }
  };

  // Auto-check customer when phone reaches 10 digits
  const handlePhoneChange = (e) => {
    const val = e.target.value.replace(/[^\d+]/g, '');
    customerLookupRef.current += 1;
    setCustomerPhone(val);
    if (val.length === 10) {
      lookupCustomerByPhone(val);
    } else {
      setCustomerExists(false);
      setSelectedPartyId(null);
      setLoyaltyPoints(0);
      setIsRedeeming(false);
      setRedeemPoints('');
      setCustomerLookupMessage('');
    }
  };

  // Add product to cart or increment quantity
  const addToCart = (product) => {
    if (!product || !product.id || product.is_active === false || Number(product.is_active) === 0) {
      setCartFeedback({ type: 'error', text: 'This product is inactive and cannot be billed.' });
      return false;
    }

    const productId = product.id ?? product.product_id;
    const cartItem = cart.find(item => String(item.product_id) === String(productId));
    const currentQty = Number(cartItem?.quantity || 0);
    const requestedQuantity = currentQty + 1;
    const availableStock = Number(product.current_stock ?? product.stock_quantity ?? 0);

    // Stock check
    if (availableStock <= 0 || requestedQuantity > availableStock
      || (!allowsFractionalQuantity(product.unit) && !Number.isInteger(requestedQuantity))) {
      setCartFeedback({
        type: 'warning',
        text: `Insufficient stock for ${product.name}. Available: ${availableStock}.`
      });
      return false;
    }

    const newQty = currentQty + 1;
    setCart(prevCart => {
      const existingIndex = prevCart.findIndex(item => String(item.product_id) === String(productId));
      if (existingIndex > -1) {
        const updated = [...prevCart];
        updated[existingIndex].quantity = newQty;
        updated[existingIndex].total = calculateLineTotal(updated[existingIndex]);
        return updated;
      } else {
        const unitPrice = parseFloat(product.sale_price ?? product.selling_price ?? 0);
        const discountPercent = parseFloat(product.discount_value || 0);
        const taxRateStr = product.tax_rate || `GST@${product.gst_rate || 0}%`;
        const taxPercent = parseFloat(String(taxRateStr).replace(/[^0-9.]/g, '') || product.gst_rate || 0);

        const newItem = {
          product_id: productId,
          name: product.name ?? product.product_name,
          brand: product.brand || '',
          model_number: product.model_number || '',
          hsn_code: product.hsn_code,
          product_code: product.product_code || product.item_code || '',
          unit: product.unit || 'Piece',
          quantity: 1,
          price_per_unit: unitPrice,
          price_tax_type: product.sale_price_tax_type || 'With Tax',
          discount_value: discountPercent,
          discount_type: product.discount_type || 'Percentage',
          tax_rate: taxRateStr,
          tax_percent: taxPercent,
          current_stock: availableStock
        };
        newItem.total = calculateLineTotal(newItem);
        return [newItem, ...prevCart];
      }
    });

    if (currentQty > 0) {
      setCartFeedback({
        type: 'success',
        text: `Quantity updated: ${product.name} × ${newQty}.`
      });
    } else {
      setCartFeedback({
        type: 'success',
        text: `Added ${product.name} to the cart.`
      });
    }
    return true;
  };

  // Calculate line item total
  const getLineAmounts = (item) => {
    const quantity = Number(item.quantity) || 0;
    const price = Number(item.price_per_unit) || 0;
    const taxRate = Number(item.tax_percent) || 0;
    const discountValue = Math.max(0, Number(item.discount_value ?? item.discount_percent) || 0);
    const billDiscount = Math.min(100, Math.max(0, Number(billDiscountPercent) || 0));
    const itemSubtotal = money(quantity * price);
    const itemDiscount = item.discount_type === 'Amount'
      ? money(Math.min(itemSubtotal, discountValue * quantity))
      : money(itemSubtotal * Math.min(100, discountValue) / 100);
    const billDiscountAmount = money((itemSubtotal - itemDiscount) * billDiscount / 100);
    const afterDiscount = money(Math.max(0, itemSubtotal - itemDiscount - billDiscountAmount));
    const inclusive = item.price_tax_type === 'With Tax';
    const taxable = inclusive ? money(afterDiscount / (1 + taxRate / 100)) : afterDiscount;
    const tax = inclusive
      ? money(afterDiscount - taxable)
      : money(taxable * taxRate / 100);
    return {
      subtotal: itemSubtotal,
      discount: itemDiscount + billDiscountAmount,
      taxable,
      tax,
      total: inclusive ? afterDiscount : money(afterDiscount + tax)
    };
  };

  const calculateLineTotal = item => getLineAmounts(item).total;

  // Update quantity (supports decimals e.g., 1.5 kg / metres)
  const updateQuantity = (index, newQty) => {
    if (newQty === '') return;
    const qty = Number(newQty);
    const item = cart[index];
    if (!Number.isFinite(qty) || qty <= 0) {
      setCartFeedback({ type: 'warning', text: 'Quantity must be greater than zero.' });
      return;
    }
    const availableStock = Number(item.current_stock || 0);
    if (qty > availableStock) {
      setCartFeedback({ type: 'warning', text: `Insufficient stock for ${item.name}. Available: ${availableStock}.` });
      return;
    }
    if (!allowsFractionalQuantity(item.unit) && !Number.isInteger(qty)) {
      setCartFeedback({ type: 'warning', text: `${item.name} is sold by whole ${item.unit || 'units'} only.` });
      return;
    }
    setCart(prev => {
      const updated = [...prev];
      updated[index].quantity = qty;
      updated[index].total = calculateLineTotal(updated[index]);
      return updated;
    });
  };

  const updateDiscount = (index, discountPercent) => {
    const discount = Number(discountPercent);
    const item = cart[index];
    const maxDiscount = item.discount_type === 'Amount' ? Number(item.price_per_unit) : 100;
    if (!Number.isFinite(discount) || discount < 0 || discount > maxDiscount) return;
    setCart(prev => prev.map((item, itemIndex) => itemIndex === index
      ? { ...item, discount_value: discount, total: calculateLineTotal({ ...item, discount_value: discount }) }
      : item));
  };

  const removeFromCart = (index) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  const clearCart = () => {
    if (cart.length > 0 && window.confirm('Clear all items from current cart?')) {
      setCart([]);
      setCashTendered('');
      setCartFeedback(null);
      setIsRedeeming(false);
      setRedeemPoints('');
    }
  };

  // Subtotals & Tax Breakdown
  const subtotal = money(cart.reduce((sum, item) => {
    return sum + getLineAmounts(item).subtotal;
  }, 0));

  const totalDiscount = money(cart.reduce((sum, item) => sum + getLineAmounts(item).discount, 0));
  const totalTax = money(cart.reduce((sum, item) => sum + getLineAmounts(item).tax, 0));
  const grandTotal = money(cart.reduce((sum, item) => sum + getLineAmounts(item).total, 0));
  const roundOff = 0;

  // Loyalty calculations:
  // Points earned = FLOOR(Eligible Amount / 100), where eligible is grandTotal before redemption
  const pointsToEarn = Math.floor((grandTotal + Number.EPSILON) / 100);

  // Redemption: 1 point = ₹1
  const enteredRedeemPoints = isRedeeming ? Math.max(0, Math.floor(Number(redeemPoints) || 0)) : 0;
  const maxRedeemablePoints = Math.min(loyaltyPoints, Math.floor(grandTotal));
  const validatedRedeemPoints = Math.min(enteredRedeemPoints, maxRedeemablePoints);
  const redemptionDiscount = validatedRedeemPoints; // 1 point = ₹1
  const finalPayable = money(Math.max(0, grandTotal - redemptionDiscount));

  // Cash change calculation
  const paymentMethods = ['Cash', 'UPI', 'Card', 'Bank Transfer'];
  const paymentRows = paymentMethods
    .map(method => ({ method, amount: Math.max(0, Number(paymentAmounts[method]) || 0) }))
    .filter(payment => payment.amount > 0);
  const amountReceived = paymentRows.reduce((sum, payment) => sum + payment.amount, 0);
  const cashAllocation = paymentRows
    .filter(payment => payment.method === 'Cash')
    .reduce((sum, payment) => sum + payment.amount, 0);
  const tendered = cashTendered === '' ? cashAllocation : Math.max(0, Number(cashTendered) || 0);
  const changeToReturn = Math.max(0, tendered - cashAllocation);
  const balanceDue = Math.max(0, finalPayable - amountReceived);

  // Hold current bill
  const handleHoldBill = async () => {
    if (cart.length === 0) {
      alert('Cart is empty. Add items before holding.');
      return;
    }
    try {
      const payload = {
        customer_name: customerName,
        customer_phone: customerPhone,
        cart_data: cart,
        subtotal,
        tax_total: totalTax,
        grand_total: grandTotal,
        item_count: cart.length,
        notes
      };
      const res = await api.holdBill(payload);
      if (res.success) {
        alert(`Bill held with reference: ${res.data.hold_reference}`);
        setCart([]);
        setCustomerName('Walk-in Customer');
        setCustomerPhone('');
        checkoutKeyRef.current = null;
        setSelectedPartyId(null);
        setCustomerExists(false);
        setLoyaltyPoints(0);
        setRedeemPoints('');
        setIsRedeeming(false);
        setCashTendered('');
        // Reload held bills
        const heldRes = await api.getHeldBills();
        if (heldRes.success) setHeldBills(heldRes.data || []);
      }
    } catch (err) {
      alert('Failed to hold bill: ' + err.message);
    }
  };

  // Resume a held bill
  const handleResumeBill = async (billId) => {
    try {
      const res = await api.resumeBill(billId);
      if (res.success && res.data) {
        setCart((res.data.cart_data || []).map(item => ({
          ...item,
          discount_value: item.discount_value ?? item.discount_percent ?? 0,
          discount_type: item.discount_type || 'Percentage'
        })));
        setCustomerName(res.data.customer_name || 'Walk-in Customer');
        setCustomerPhone(res.data.customer_phone || '');
        setSelectedPartyId(null);
        setCustomerExists(false);
        setLoyaltyPoints(0);
        setRedeemPoints('');
        setIsRedeeming(false);
        setShowHeldModal(false);
        setHeldBills(prev => prev.filter(b => b.id !== billId));
        if (res.data.customer_phone) {
          lookupCustomerByPhone(res.data.customer_phone);
        }
      }
    } catch (err) {
      alert('Failed to resume bill: ' + err.message);
    }
  };

  // Complete Sale & Checkout
  const handleCompleteSale = async () => {
    if (cart.length === 0) {
      alert('Cart is empty. Please add items to checkout.');
      return;
    }
    const cleanPhone = customerPhone.trim();
    if (!cleanPhone) {
      alert('Customer phone number is mandatory for billing.');
      return;
    }
    if (!/^\+?[0-9\s()-]{7,20}$/.test(cleanPhone)) {
      alert('Please enter a valid customer mobile number.');
      return;
    }
    if (!customerName.trim() || customerName === 'Walk-in Customer') {
      alert('Please enter the customer name to register or identify this customer.');
      return;
    }
    if (amountReceived > finalPayable) {
      alert('Payment allocation cannot be greater than the amount due.');
      return;
    }
    if (amountReceived === 0 && finalPayable > 0 && paymentType !== 'Credit') {
      alert('Enter the amount actually received, or choose Credit to record the balance as outstanding.');
      return;
    }
    if (cashAllocation > 0 && tendered < cashAllocation) {
      alert('Cash received cannot be less than the cash payment allocation.');
      return;
    }

    try {
      setIsSubmitting(true);

      const salePayload = {
        idempotency_key: checkoutKeyRef.current || (window.crypto?.randomUUID
          ? window.crypto.randomUUID()
          : `pos-${Date.now()}-${Math.random().toString(36).slice(2)}`),
        invoice_date: new Date().toISOString().split('T')[0],
        party_id: selectedPartyId,
        customer_name: customerName.trim(),
        phone_number: cleanPhone,
        state_of_supply: stateOfSupply,
        payment_type: paymentType,
        payments: paymentType === 'Credit' ? [] : paymentRows,
        cash_tendered: cashAllocation > 0 ? tendered : 0,
        bill_discount_percent: Number(billDiscountPercent) || 0,
        redeem_points: validatedRedeemPoints,
        theme_name: 'Thermal Receipt',
        notes: notes || 'POS Electrical Store Checkout',
        items: cart.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          discount_value: item.discount_value ?? item.discount_percent ?? 0,
          discount_type: item.discount_type || 'Percentage'
        }))
      };
      checkoutKeyRef.current = salePayload.idempotency_key;

      const res = await api.createSale(salePayload);
      if (res.success && res.data) {
        const saleDetail = await api.getSaleById(res.data.id);
        if (!saleDetail.success || !saleDetail.data) {
          throw new Error(saleDetail.message || 'Sale was saved but invoice details could not be loaded.');
        }
        // Build checkout success summary data
        const summaryData = {
          invoice_number: saleDetail.data.invoice_number,
          phone_number: saleDetail.data.phone_number || cleanPhone,
          customer_name: saleDetail.data.customer_name || res.data.customer_name || customerName,
          total_purchase_amount: saleDetail.data.grand_total,
          points_earned: saleDetail.data.points_earned ?? res.data.points_earned ?? pointsToEarn,
          points_redeemed: saleDetail.data.points_redeemed ?? res.data.points_redeemed ?? validatedRedeemPoints,
          remaining_points: res.data.remaining_points,
          final_amount_paid: saleDetail.data.received_amount,
          balance_due: saleDetail.data.balance_due,
          change_returned: saleDetail.data.change_returned,
          amount_tendered: saleDetail.data.amount_tendered,
          payment_type: saleDetail.data.payment_type,
          sale_id: saleDetail.data.id
        };
        setCheckoutSuccess(summaryData);
        setCompletedSale({
          ...saleDetail.data,
          ...summaryData,
          remaining_points: summaryData.remaining_points ?? saleDetail.data.remaining_points
        });

        // Reset cart state
        setCart([]);
        setCustomerName('Walk-in Customer');
        setCustomerPhone('');
        setSelectedPartyId(null);
        setCashTendered('');
        setPaymentAmounts({ Cash: '', UPI: '', Card: '', 'Bank Transfer': '' });
        setNotes('');
        checkoutKeyRef.current = null;
        setRedeemPoints('');
        setIsRedeeming(false);
        setBillDiscountPercent(0);
        setLoyaltyPoints(0);
        setCustomerExists(false);
        setCustomerLookupMessage('');
      } else {
        alert(res.message || 'Failed to complete sale.');
      }
    } catch (err) {
      alert('Checkout error: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered products for visual grid
  const filteredProducts = products.filter(p => {
    const matchesCategory = selectedCategory === 'All' || p.category_name === selectedCategory;
    const matchesSearch = !searchTerm ||
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.brand && p.brand.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.model_number && p.model_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.product_code && p.product_code.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const handleProductSearchKeyDown = (event) => {
    if (event.key === 'ArrowDown' && filteredProducts.length) {
      event.preventDefault();
      setHighlightedProductIndex(index => Math.min(index + 1, filteredProducts.length - 1));
    } else if (event.key === 'ArrowUp' && filteredProducts.length) {
      event.preventDefault();
      setHighlightedProductIndex(index => Math.max(index - 1, 0));
    } else if (event.key === 'Enter' && filteredProducts[highlightedProductIndex]) {
      event.preventDefault();
      addToCart(filteredProducts[highlightedProductIndex]);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F4F3EF] overflow-hidden select-none">
      {/* Top POS Action Banner */}
      <div className="min-h-12 bg-[#202D28] border-b border-[#315B45] px-4 py-2 flex items-center justify-between gap-3 shadow-sm text-white">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/')}
            className="p-1.5 hover:bg-white/10 rounded text-white/80 transition"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center space-x-2">
            <span className="w-6 h-6 rounded bg-[#202D28] text-[#B7D96B] flex items-center justify-center font-black text-xs shadow">
              ⚡
            </span>
            <span className="font-bold text-white text-sm">Electrical Billing Counter</span>
          </div>

          <span className="text-[11px] px-2.5 py-0.5 rounded-full font-medium border bg-white/10 text-[#D5E6B1] border-white/15 flex items-center gap-1.5">
            <Gift className="w-3 h-3 text-[#B7D96B]" />
            <span>Loyalty Rewards: ₹100 = 1 Point</span>
          </span>
        </div>

        {/* Shortcuts & Actions */}
        <div className="flex items-center space-x-2 text-xs">
          <button
            onClick={() => setShowHeldModal(true)}
            className="bg-white/10 hover:bg-white/15 text-[#F2D48A] border border-white/15 px-2.5 py-1 rounded-lg flex items-center space-x-1.5 transition font-semibold"
          >
            <PauseCircle className="w-3.5 h-3.5 text-amber-600" />
            <span>Held Bills ({heldBills.length})</span>
          </button>

          <button
            onClick={handleHoldBill}
            disabled={cart.length === 0}
            className="bg-white/10 hover:bg-white/15 text-white border border-white/15 px-2.5 py-1 rounded-lg flex items-center space-x-1 transition disabled:opacity-50"
            title="Hold current cart (F8)"
          >
            <span>Hold (F8)</span>
          </button>

          <button
            onClick={clearCart}
            disabled={cart.length === 0}
            className="bg-red-500/15 hover:bg-red-500/25 text-red-100 border border-red-300/30 px-2 py-1 rounded-lg flex items-center space-x-1 transition disabled:opacity-50"
            title="Clear Cart"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Main Checkout View: Left Product Catalog (58%) + Right Billing Cart (42%) */}
      <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
        {/* Left Side: Product Search, Category Filter & Products Grid */}
        <div className="w-full md:w-[58%] min-h-0 flex-1 md:flex-none flex flex-col border-r border-[#E3E4DD] bg-white overflow-hidden">
          {/* Product Search & Category Filter */}
          <div className="p-3 bg-gray-50/90 border-b border-gray-200 space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleProductSearchKeyDown}
                placeholder="Search electrical items by name, brand, model, or product code..."
                className="w-full pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-lg text-xs outline-none focus:border-[#315B45] focus:ring-1 focus:ring-[#315B45] font-medium shadow-xs"
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex space-x-1.5 overflow-x-auto py-1 scrollbar-thin">
              <button
                onClick={() => setSelectedCategory('All')}
                className={`px-3 py-1 rounded-full text-[11px] whitespace-nowrap font-medium transition ${
                  selectedCategory === 'All'
                    ? 'bg-[#202D28] text-[#B7D96B] font-bold shadow-xs'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                }`}
              >
                All Categories
              </button>
              {categories.map(c => (
                <button
                  key={c.id || c.category_id}
                  onClick={() => setSelectedCategory(c.name || c.category_name)}
                  className={`px-3 py-1 rounded-full text-[11px] whitespace-nowrap font-medium transition ${
                    selectedCategory === (c.name || c.category_name)
                      ? 'bg-[#202D28] text-[#B7D96B] font-bold shadow-xs'
                      : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {c.name || c.category_name}
                </button>
              ))}
            </div>

            {cartFeedback && (
              <p className={`text-xs font-semibold px-2.5 py-1 rounded ${
                cartFeedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                cartFeedback.type === 'warning' ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-red-50 text-red-800 border border-red-200'
              }`} role="status">
                {cartFeedback.text}
              </p>
            )}
          </div>

          {/* Product Cards Catalog Grid */}
          <div className="flex-1 overflow-y-auto p-3">
            {searchingProducts && (
              <p className="text-xs text-[#315B45] font-semibold mb-2 flex items-center gap-2" role="status">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Searching inventory…
              </p>
            )}
            {filteredProducts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-2">
                <ShoppingCart className="w-12 h-12 stroke-[1.2] text-gray-300" />
                <p className="text-xs font-medium">No electrical items found matching "{searchTerm}".</p>
                <button
                  onClick={() => navigate('/items/add')}
                  className="bg-[#202D28] text-[#B7D96B] hover:bg-[#283832] px-3.5 py-1.5 rounded text-xs font-bold transition"
                >
                  + Add New Product
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5">
                {filteredProducts.map((p, index) => (
                  <div
                    key={p.id || p.product_id}
                    onClick={() => addToCart(p)}
                    onMouseEnter={() => setHighlightedProductIndex(index)}
                    className={`p-3 rounded-xl border bg-white shadow-sm hover:border-[#315B45] hover:shadow-lg hover:-translate-y-0.5 cursor-pointer transition-all duration-200 flex flex-col justify-between active:scale-[0.98] group ${
                      index === highlightedProductIndex ? 'border-[#315B45] ring-1 ring-[#315B45]/20' : 'border-gray-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1">
                        <span className="font-bold text-gray-900 text-xs line-clamp-1 group-hover:text-[#315B45]">
                          {p.name || p.product_name}
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono flex-shrink-0">
                          {p.product_code || p.item_code}
                        </span>
                      </div>
                      <div className="text-[10px] text-gray-500 mt-1 flex items-center justify-between">
                        <span>{p.brand || 'General'} {p.model_number ? `• ${p.model_number}` : ''}</span>
                        <span className="font-semibold text-gray-600">{p.unit || 'Piece'}</span>
                      </div>
                      <div className="text-[9px] text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded inline-block mt-1 font-medium">
                        {p.tax_rate || `GST@${p.gst_rate || 0}%`}
                      </div>
                    </div>

                    <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between">
                      <div className="font-black text-[#315B45] text-sm">
                        {formatCurrency(p.sale_price || p.selling_price)}
                      </div>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                        parseFloat(p.current_stock ?? p.stock_quantity ?? 0) <= 0
                          ? 'bg-red-100 text-red-700'
                          : parseFloat(p.current_stock ?? p.stock_quantity ?? 0) <= parseFloat(p.min_stock_to_maintain || 5)
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}>
                        {parseFloat(p.current_stock ?? p.stock_quantity ?? 0) > 0
                          && parseFloat(p.current_stock ?? p.stock_quantity ?? 0) <= parseFloat(p.min_stock_to_maintain || 5)
                          ? 'Low stock: ' : 'Stock: '}
                        {p.current_stock ?? p.stock_quantity ?? 0}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Customer Phone & Loyalty Points + Cart & Checkout */}
        <div className="w-full md:w-[42%] min-h-0 flex-1 md:flex-none flex flex-col bg-white overflow-hidden">
          {/* Customer Identification Header (Mandatory Phone) */}
          <div className="p-3 bg-gradient-to-r from-gray-50 to-slate-100 border-b border-gray-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-800 flex items-center gap-1.5 uppercase tracking-wide">
                <Phone className="w-3.5 h-3.5 text-[#315B45]" />
                Customer Mobile Identification *
              </span>
              {customerExists ? (
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Verified Customer
                </span>
              ) : customerPhone.length >= 10 ? (
                <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                  <UserPlus className="w-3 h-3 text-amber-600" />
                  New Customer
                </span>
              ) : null}
            </div>

            <div className="grid grid-cols-12 gap-2">
              {/* Phone Input */}
              <div className="col-span-5 relative">
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={handlePhoneChange}
                  onBlur={() => lookupCustomerByPhone()}
                  onKeyDown={(e) => { if (e.key === 'Enter') lookupCustomerByPhone(); }}
                  placeholder="Mobile (10 digits) *"
                  maxLength={15}
                  required
                  className="w-full bg-white border-2 border-gray-300 focus:border-[#315B45] rounded-lg px-2.5 py-1.5 text-xs font-bold text-gray-900 outline-none shadow-xs"
                />
                {isLookingUpPhone && (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin absolute right-2.5 top-2.5 text-gray-400" />
                )}
              </div>

              {/* Name Input */}
              <div className="col-span-7 relative">
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  onFocus={() => setShowCustomerDropdown(true)}
                  placeholder={customerExists ? 'Customer Name' : 'Enter Customer Name *'}
                  className="w-full bg-white border border-gray-300 focus:border-[#315B45] rounded-lg px-2.5 py-1.5 text-xs font-semibold text-gray-800 outline-none shadow-xs"
                />
              </div>
            </div>

            {/* Customer Status & Loyalty Points Indicator */}
            <div className="flex items-center justify-between text-[11px] pt-0.5">
              <span className={customerExists ? 'text-emerald-700 font-medium truncate max-w-[200px]' : 'text-gray-500 truncate max-w-[200px]'}>
                {customerLookupMessage || 'Enter mobile number to retrieve loyalty points'}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200 font-bold">
                <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                Available: {loyaltyPoints} pts
              </span>
            </div>
            <label className="flex items-center gap-2 text-[10px] text-gray-600 font-semibold">
              GST state of supply
              <select
                value={stateOfSupply}
                onChange={event => setStateOfSupply(event.target.value)}
                className="min-w-0 flex-1 bg-white border border-gray-300 rounded-lg px-2 py-1 text-xs text-gray-800 outline-none focus:border-[#315B45]"
              >
                {[
                  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa',
                  'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala',
                  'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland',
                  'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
                  'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi', 'Jammu and Kashmir',
                  'Ladakh', 'Andaman and Nicobar Islands', 'Chandigarh',
                  'Dadra and Nagar Haveli and Daman and Diu', 'Lakshadweep', 'Puducherry'
                ].map(state => <option key={state} value={state}>{state}</option>)}
              </select>
            </label>

            {/* Quick customer select dropdown */}
            {showCustomerDropdown && parties.length > 0 && (
              <div className="absolute top-28 left-3 right-3 bg-white rounded-lg shadow-xl border border-gray-200 z-30 max-h-48 overflow-y-auto">
                <div className="p-1.5 border-b border-gray-100 text-[10px] text-gray-400 font-bold flex justify-between items-center bg-gray-50">
                  <span>SELECT REGISTERED CUSTOMER</span>
                  <button onClick={() => setShowCustomerDropdown(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-3 h-3" />
                  </button>
                </div>
                {parties.map(p => (
                  <div
                    key={p.id || p.customer_id}
                    onClick={() => {
                      setCustomerName(p.name || p.customer_name);
                      setCustomerPhone(p.phone_number || p.phone || '');
                      setSelectedPartyId(p.id || p.customer_id);
                      setLoyaltyPoints(Number(p.loyalty_points || 0));
                      setCustomerExists(true);
                      setCustomerLookupMessage(`Existing customer: ${p.name || p.customer_name}`);
                      setRedeemPoints('');
                      setIsRedeeming(false);
                      setShowCustomerDropdown(false);
                    }}
                    className="p-2 hover:bg-emerald-50 cursor-pointer text-xs flex justify-between items-center border-b border-gray-50"
                  >
                    <div>
                      <div className="font-semibold text-gray-800">{p.name || p.customer_name}</div>
                      <div className="text-[10px] text-gray-500">{p.phone_number || p.phone || 'No phone'}</div>
                    </div>
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                      ★ {p.loyalty_points || 0} pts
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-2 divide-y divide-gray-100">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-1">
                <ShoppingCart className="w-10 h-10 text-gray-300" />
                <p className="text-xs font-medium">Cart is empty</p>
                <p className="text-[11px] text-gray-400">Select electrical products from the catalog on the left.</p>
              </div>
            ) : (
              cart.map((item, idx) => (
                <div key={idx} className="py-2.5 border-b border-gray-100 last:border-0">
                  {/* Row 1: Product name + details */}
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex-1 mr-2">
                      <div className="font-bold text-gray-900 text-xs leading-tight">{item.name}</div>
                      <div className="flex items-center space-x-2 mt-0.5 flex-wrap gap-y-1">
                        {item.brand && (
                          <span className="text-[10px] text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded font-medium">{item.brand}</span>
                        )}
                        <span className="text-[10px] text-gray-500 font-semibold">{item.unit || 'Piece'}</span>
                        {item.product_code && (
                          <span className="font-mono text-[9px] text-[#315B45] bg-[#EAF4EC] border border-[#C9D9C5] px-1.5 py-0.5 rounded">
                            {item.product_code}
                          </span>
                        )}
                        <span className="text-[10px] text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded font-medium">{item.tax_rate}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFromCart(idx)}
                      className="p-1 hover:text-red-600 text-gray-400 transition flex-shrink-0"
                      title="Remove item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Row 2: Price · Qty controls · Total */}
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] text-gray-500 min-w-[70px]">
                      <span className="text-gray-400">@</span>{' '}
                      <span className="font-semibold text-gray-800">{formatCurrency(item.price_per_unit)}</span>
                      <div className="mt-1 flex items-center gap-1">
                        <label htmlFor={`discount-${idx}`} className="text-[9px] text-gray-500">
                          Disc {item.discount_type === 'Amount' ? '₹/unit' : '%'}
                        </label>
                        <input
                          id={`discount-${idx}`}
                          type="number"
                          min="0"
                          step="0.1"
                          value={item.discount_value ?? item.discount_percent ?? 0}
                          max={item.discount_type === 'Amount' ? item.price_per_unit : 100}
                          onChange={event => updateDiscount(idx, event.target.value)}
                          className="w-12 px-1 py-0.5 border border-gray-200 rounded text-[10px] text-right outline-none focus:border-[#315B45]"
                        />
                      </div>
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => updateQuantity(idx, item.quantity - 1)}
                        disabled={item.quantity <= (allowsFractionalQuantity(item.unit) ? 0.01 : 1)}
                        className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center font-bold"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <input
                        type="number"
                        min={allowsFractionalQuantity(item.unit) ? '0.01' : '1'}
                        max={item.current_stock}
                        step={allowsFractionalQuantity(item.unit) ? 'any' : '1'}
                        value={item.quantity}
                        onChange={(e) => updateQuantity(idx, e.target.value)}
                        className="w-12 text-center py-0.5 font-bold border border-gray-300 rounded text-xs outline-none focus:border-[#315B45]"
                      />
                      <button
                        onClick={() => updateQuantity(idx, item.quantity + 1)}
                        disabled={item.quantity >= item.current_stock}
                        className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center font-bold"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <span className="font-extrabold text-gray-900 text-xs w-20 text-right">
                      {formatCurrency(item.total)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Cart Summary & Payment Controls */}
          <div className="border-t border-gray-200 bg-gray-50 p-3 space-y-2 text-xs">
            {/* Calculation rows */}
            <div className="space-y-1 text-gray-600 text-[11px]">
              <div className="flex justify-between">
                <span>Subtotal ({cart.length} items):</span>
                <span className="font-semibold text-gray-800">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Total GST / Taxes:</span>
                <span className="font-semibold text-gray-800">{formatCurrency(totalTax)}</span>
              </div>
              <div className="flex items-center justify-between text-emerald-700">
                <label htmlFor="bill-discount" className="font-medium">Bill discount (%):</label>
                <input
                  id="bill-discount"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={billDiscountPercent}
                  onChange={event => {
                    const value = Number(event.target.value);
                    if (event.target.value === '') setBillDiscountPercent('');
                    else if (Number.isFinite(value) && value >= 0 && value <= 100) setBillDiscountPercent(value);
                  }}
                  className="w-16 px-1.5 py-0.5 border border-emerald-200 rounded text-right text-xs font-semibold outline-none focus:border-[#315B45]"
                />
              </div>
              {totalDiscount > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Total discount:</span>
                  <span>-{formatCurrency(totalDiscount)}</span>
                </div>
              )}
            </div>

            {/* Loyalty Points Redemption Box */}
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-2.5 space-y-2">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 font-bold text-amber-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isRedeeming}
                    disabled={loyaltyPoints <= 0 || grandTotal <= 0}
                    onChange={(e) => {
                      setIsRedeeming(e.target.checked);
                      if (e.target.checked) {
                        setRedeemPoints(String(maxRedeemablePoints));
                      } else {
                        setRedeemPoints('');
                      }
                    }}
                    className="rounded text-[#315B45] focus:ring-[#315B45]"
                  />
                  <span>Redeem Points (1 pt = ₹1)</span>
                </label>
                <span className="text-[10px] font-bold text-amber-800">
                  Max: {maxRedeemablePoints} pts
                </span>
              </div>

              {isRedeeming && (
                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className="text-[11px] text-gray-700">Enter points to redeem:</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="1"
                      max={maxRedeemablePoints}
                      step="1"
                      value={redeemPoints}
                      onChange={(e) => setRedeemPoints(e.target.value)}
                      placeholder="0"
                      className="w-20 px-2 py-1 bg-white border border-amber-300 rounded text-right font-bold text-xs outline-none focus:border-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => setRedeemPoints(String(maxRedeemablePoints))}
                      className="px-2 py-1 bg-amber-200 hover:bg-amber-300 text-amber-900 rounded font-bold text-[10px]"
                    >
                      MAX
                    </button>
                  </div>
                </div>
              )}

              {/* Redemption breakdown display */}
              {redemptionDiscount > 0 && (
                <div className="flex justify-between text-emerald-800 font-bold text-xs pt-1 border-t border-amber-200/70">
                  <span>Points Redeemed Discount:</span>
                  <span>-₹{redemptionDiscount.toFixed(2)} ({validatedRedeemPoints} pts)</span>
                </div>
              )}

              {/* Points Earned on this bill notice */}
              <div className="flex justify-between text-[10px] text-gray-600 pt-0.5">
                <span>Points earned on this bill (₹100 = 1 pt):</span>
                <span className="font-bold text-[#315B45]">+{pointsToEarn} pts</span>
              </div>
            </div>

            {/* Final Payable Display */}
            <div className="pt-2 border-t border-gray-200 flex justify-between items-baseline">
              <span className="text-sm font-bold text-gray-900">Final Payable Amount:</span>
              <span className="text-xl font-black text-[#202D28]">
                {formatCurrency(finalPayable)}
              </span>
            </div>

            {/* Payment Method Selector */}
            <div className="pt-1">
              <div className="text-[10px] font-bold text-gray-500 uppercase mb-1">Payment Method (F4 Cash)</div>
              <div className="grid grid-cols-4 gap-1">
                {[
                  { id: 'Cash', icon: Wallet, label: 'Cash' },
                  { id: 'UPI', icon: QrCode, label: 'UPI' },
                  { id: 'Card', icon: CreditCard, label: 'Card' },
                  { id: 'Split', icon: Split, label: 'Split' },
                  { id: 'Bank Transfer', icon: CreditCard, label: 'Bank' },
                  { id: 'Credit', icon: UserCheck, label: 'Credit' },
                ].map(m => (
                  <button
                    key={m.id}
                    onClick={() => setPaymentType(m.id)}
                    className={`py-1.5 px-1 rounded-lg flex flex-col items-center justify-center font-bold text-[10px] transition border ${
                      paymentType === m.id
                        ? 'bg-[#202D28] text-[#B7D96B] border-[#202D28] shadow-sm'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    <m.icon className="w-3.5 h-3.5 mb-0.5" />
                    <span>{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {paymentType === 'Credit' ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-[11px] text-amber-900">
                No payment is recorded now. The unpaid balance will remain outstanding for this customer.
              </div>
            ) : (
              <div className="bg-white p-2 rounded-lg border border-gray-200 space-y-2 text-xs">
                {(paymentType === 'Split' ? paymentMethods : [paymentType]).map(method => (
                  <label key={method} className="flex items-center justify-between gap-3 text-gray-600 font-semibold">
                    <span>{method} payment received</span>
                    <input
                      type="number"
                      min="0"
                      max={finalPayable}
                      step="0.01"
                      value={paymentAmounts[method]}
                      onChange={event => setPaymentAmounts(current => ({ ...current, [method]: event.target.value }))}
                      placeholder="0.00"
                      className="w-32 px-2 py-1 border border-gray-300 rounded font-bold text-right text-sm outline-none focus:border-[#315B45]"
                    />
                  </label>
                ))}
                {cashAllocation > 0 && (
                  <div className="grid grid-cols-2 gap-2 border-t border-gray-100 pt-2">
                    <label className="text-[10px] text-gray-500 font-semibold">
                      Cash tendered
                      <input
                        type="number"
                        min={cashAllocation}
                        step="0.01"
                        value={cashTendered}
                        onChange={event => setCashTendered(event.target.value)}
                        placeholder={cashAllocation.toFixed(2)}
                        className="w-full mt-1 px-2 py-1 border border-gray-300 rounded font-bold text-sm outline-none focus:border-[#315B45]"
                      />
                    </label>
                    <div className="text-[10px] text-gray-500 font-semibold">
                      Change to return
                      <div className="mt-1 px-2 py-1 bg-emerald-50 border border-emerald-200 rounded font-black text-sm text-emerald-700">
                        {formatCurrency(changeToReturn)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-between text-[11px] text-gray-600">
              <span>Payment allocated: {formatCurrency(amountReceived)}</span>
              <span className={balanceDue > 0 ? 'text-amber-700 font-bold' : 'text-emerald-700 font-bold'}>
                Outstanding: {formatCurrency(balanceDue)}
              </span>
            </div>

            {/* Complete Sale & Print Receipt Button */}
            <button
              onClick={handleCompleteSale}
              disabled={cart.length === 0 || isSubmitting || searchingProducts}
              className="w-full bg-[#315B45] hover:bg-[#202D28] text-white py-3 rounded-xl font-black text-sm shadow-md transition active:scale-95 disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              <Printer className="w-4 h-4" />
              <span>{isSubmitting ? 'Processing Bill...' : `Complete Sale (F9)`}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Held Bills Modal */}
      {showHeldModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="p-3 border-b border-gray-100 flex items-center justify-between bg-amber-50">
              <div className="flex items-center space-x-2">
                <PauseCircle className="w-5 h-5 text-amber-600" />
                <span className="font-bold text-gray-800 text-sm">Parked / Held Bills</span>
              </div>
              <button onClick={() => setShowHeldModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 max-h-80 overflow-y-auto space-y-2">
              {heldBills.length === 0 ? (
                <div className="text-center py-6 text-gray-400 text-xs">
                  No parked bills found.
                </div>
              ) : (
                heldBills.map(b => (
                  <div
                    key={b.id}
                    className="p-3 rounded-lg border border-gray-200 hover:border-amber-400 bg-white shadow-xs flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-gray-900 flex items-center space-x-2">
                        <span>{b.customer_name}</span>
                        <span className="text-[10px] text-gray-400 font-mono">({b.hold_reference})</span>
                      </div>
                      <div className="text-[10px] text-gray-500 mt-0.5">
                        {b.item_count} items • Held at {new Date(b.held_at).toLocaleTimeString()}
                      </div>
                      <div className="font-bold text-[#315B45] mt-1">
                        {formatCurrency(b.grand_total)}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleResumeBill(b.id)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded font-bold text-xs shadow-sm flex items-center space-x-1"
                      >
                        <PlayCircle className="w-3.5 h-3.5" />
                        <span>Resume</span>
                      </button>
                      <button
                        onClick={async () => {
                          if (window.confirm('Delete this held bill?')) {
                            await api.deleteHeldBill(b.id);
                            setHeldBills(prev => prev.filter(x => x.id !== b.id));
                          }
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Post-Checkout Success Modal (Requirement 6) */}
      {checkoutSuccess && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-emerald-200 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-[#202D28] text-white p-4 text-center relative">
              <div className="w-12 h-12 bg-emerald-500/20 text-[#B7D96B] rounded-full flex items-center justify-center mx-auto mb-2 border border-[#B7D96B]/30">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h2 className="text-base font-black tracking-wide">Checkout Completed Successfully!</h2>
              <p className="text-xs text-gray-300 mt-0.5">Invoice #{checkoutSuccess.invoice_number}</p>
              <button
                onClick={() => setCheckoutSuccess(null)}
                className="absolute top-3 right-3 text-gray-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Bill & Loyalty Details (All 7 required items) */}
            <div className="p-5 space-y-3 text-xs bg-slate-50/50">
              <div className="bg-white p-3.5 rounded-xl border border-gray-200 space-y-2 shadow-xs">
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-500 font-medium">Invoice Number:</span>
                  <span className="font-bold text-gray-900 font-mono">{checkoutSuccess.invoice_number}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-500 font-medium">Customer Mobile:</span>
                  <span className="font-bold text-gray-900">{checkoutSuccess.phone_number}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-500 font-medium">Final Bill Amount:</span>
                  <span className="font-bold text-gray-900">{formatCurrency(checkoutSuccess.total_purchase_amount)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-500 font-medium">Payment method:</span>
                  <span className="font-bold text-gray-900">{checkoutSuccess.payment_type}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-100 text-emerald-700">
                  <span className="font-semibold flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-emerald-600" />
                    Points Earned:
                  </span>
                  <span className="font-black text-sm">+{checkoutSuccess.points_earned} pts</span>
                </div>
                {checkoutSuccess.points_redeemed > 0 && (
                  <div className="flex justify-between py-1 border-b border-gray-100 text-amber-800">
                    <span className="font-semibold">Points Redeemed:</span>
                    <span className="font-bold">-{checkoutSuccess.points_redeemed} pts (-₹{checkoutSuccess.points_redeemed})</span>
                  </div>
                )}
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-500 font-medium">Remaining Points Balance:</span>
                  <span className="font-extrabold text-blue-700">{checkoutSuccess.remaining_points} pts</span>
                </div>
                <div className="flex justify-between pt-1 text-sm">
                  <span className="font-bold text-gray-900">Amount received:</span>
                  <span className="font-black text-base text-[#315B45]">
                    {formatCurrency(checkoutSuccess.final_amount_paid)}
                  </span>
                </div>
                {Number(checkoutSuccess.balance_due) > 0 && (
                  <div className="flex justify-between text-amber-800 font-bold">
                    <span>Outstanding balance:</span>
                    <span>{formatCurrency(checkoutSuccess.balance_due)}</span>
                  </div>
                )}
                {Number(checkoutSuccess.change_returned) > 0 && (
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>Change returned:</span>
                    <span>{formatCurrency(checkoutSuccess.change_returned)}</span>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  onClick={() => {
                    setShowPreviewModal(true);
                  }}
                  className="py-2.5 px-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 rounded-xl font-bold flex items-center justify-center gap-1.5 transition shadow-xs"
                >
                  <Printer className="w-4 h-4 text-gray-600" />
                  <span>Print Receipt</span>
                </button>
                <button
                  onClick={() => {
                    setCheckoutSuccess(null);
                    setCompletedSale(null);
                    searchInputRef.current?.focus();
                  }}
                  className="py-2.5 px-3 bg-[#315B45] hover:bg-[#202D28] text-white rounded-xl font-bold flex items-center justify-center gap-1.5 transition shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Start Next Bill</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Completed Invoice Print Preview Modal */}
      {showPreviewModal && completedSale && (
        <InvoicePreviewModal
          sale={completedSale}
          business={business}
          onClose={() => {
            setShowPreviewModal(false);
          }}
        />
      )}
    </div>
  );
}
