import WooCommerceRestApi from "@woocommerce/woocommerce-rest-api";

let wooApi = null;

export function initWooCommerce(url, consumerKey, consumerSecret) {
  if (!url || !consumerKey || !consumerSecret) {
    console.log('WooCommerce credentials not configured - using simulated data');
    return null;
  }
  
  wooApi = new WooCommerceRestApi({
    url,
    consumerKey,
    consumerSecret,
    version: "wc/v3"
  });
  
  console.log('WooCommerce API initialized for:', url);
  return wooApi;
}

export function getWooApi() {
  return wooApi;
}

// Fetch customers from WooCommerce
export async function getWooCustomers(perPage = 100) {
  if (!wooApi) throw new Error('WooCommerce not configured');
  const response = await wooApi.get("customers", { per_page: perPage });
  return response.data;
}

// Fetch orders from WooCommerce
export async function getWooOrders(perPage = 100) {
  if (!wooApi) throw new Error('WooCommerce not configured');
  const response = await wooApi.get("orders", { per_page: perPage });
  return response.data;
}

// Fetch single order from WooCommerce
export async function getWooOrder(orderId) {
  if (!wooApi) throw new Error('WooCommerce not configured');
  const response = await wooApi.get(`orders/${orderId}`);
  return response.data;
}

// Create customer in WooCommerce
export async function createWooCustomer(customerData) {
  if (!wooApi) throw new Error('WooCommerce not configured');
  const response = await wooApi.post("customers", customerData);
  return response.data;
}

// Update customer in WooCommerce
export async function updateWooCustomer(customerId, customerData) {
  if (!wooApi) throw new Error('WooCommerce not configured');
  const response = await wooApi.put(`customers/${customerId}`, customerData);
  return response.data;
}

// Create order in WooCommerce
export async function createWooOrder(orderData) {
  if (!wooApi) throw new Error('WooCommerce not configured');
  const response = await wooApi.post("orders", orderData);
  return response.data;
}

// Update order status in WooCommerce
export async function updateWooOrderStatus(orderId, status) {
  if (!wooApi) throw new Error('WooCommerce not configured');
  const response = await wooApi.put(`orders/${orderId}`, { status });
  return response.data;
}

// Simulated data for demo (when WooCommerce is not configured)
export function getSimulatedCustomers() {
  return [
    { id: 'WC-1001', first_name: 'John', last_name: 'Doe', email: 'john@example.com', billing: { phone: '555-0101', company: 'Acme Inc', address_1: '123 Main St' } },
    { id: 'WC-1002', first_name: 'Jane', last_name: 'Smith', email: 'jane@example.com', billing: { phone: '555-0102', company: 'Tech Corp', address_1: '456 Oak Ave' } },
    { id: 'WC-1003', first_name: 'Bob', last_name: 'Wilson', email: 'bob@example.com', billing: { phone: '555-0103', company: 'Design Co', address_1: '789 Pine Rd' } },
    { id: 'WC-1004', first_name: 'Alice', last_name: 'Johnson', email: 'alice@example.com', billing: { phone: '555-0104', company: 'Startup LLC', address_1: '321 Elm St' } },
    { id: 'WC-1005', first_name: 'Charlie', last_name: 'Brown', email: 'charlie@example.com', billing: { phone: '555-0105', company: 'Freelance', address_1: '654 Maple Dr' } },
  ];
}

export function getSimulatedOrders() {
  return [
    { id: 'WC-5001', customer_id: 'WC-1001', number: '5001', line_items: [{ name: 'Widget Pro', quantity: 2, total: '59.98' }], total: '59.98', status: 'completed', payment_method_title: 'Credit Card' },
    { id: 'WC-5002', customer_id: 'WC-1002', number: '5002', line_items: [{ name: 'Gadget Plus', quantity: 1, total: '49.99' }], total: '49.99', status: 'processing', payment_method_title: 'PayPal' },
    { id: 'WC-5003', customer_id: 'WC-1001', number: '5003', line_items: [{ name: 'Tool Basic', quantity: 3, total: '45.00' }], total: '45.00', status: 'on-hold', payment_method_title: 'Bank Transfer' },
    { id: 'WC-5004', customer_id: 'WC-1003', number: '5004', line_items: [{ name: 'Premium Kit', quantity: 1, total: '99.99' }], total: '99.99', status: 'completed', payment_method_title: 'Credit Card' },
    { id: 'WC-5005', customer_id: 'WC-1004', number: '5005', line_items: [{ name: 'Starter Pack', quantity: 2, total: '29.98' }], total: '29.98', status: 'pending', payment_method_title: 'Cash on Delivery' },
  ];
}
