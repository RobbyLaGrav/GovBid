// =============================================================================
// GovBid Pro - Stripe Configuration
// =============================================================================
// Stripe payment processing configuration
// =============================================================================

import Stripe from 'stripe';

// =============================================================================
// STRIPE CONFIGURATION INTERFACES
// =============================================================================

export interface StripeConfig {
  secretKey: string;
  publicKey: string;
  webhookSecret: string;
  apiVersion: string;
  currency: string;
  trialDays: number;
}

export interface PlanConfig {
  id: string;
  name: string;
  priceId: string;
  price: number;
  interval: 'month' | 'year';
  features: string[];
  limits: PlanLimits;
}

export interface PlanLimits {
  maxUsers: number;
  maxSavedContracts: number;
  maxBidsPerMonth: number;
  maxAIGenerations: number;
  maxStorageGB: number;
}

// =============================================================================
// CONFIGURATION VALUES
// =============================================================================

export const stripeConfig: StripeConfig = {
  secretKey: process.env.STRIPE_SECRET_KEY || '',
  publicKey: process.env.STRIPE_PUBLIC_KEY || '',
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  apiVersion: '2023-10-16',
  currency: process.env.STRIPE_CURRENCY || 'usd',
  trialDays: parseInt(process.env.STRIPE_TRIAL_DAYS || '14', 10),
};

// =============================================================================
// SUBSCRIPTION PLANS
// =============================================================================

export const subscriptionPlans: Record<string, PlanConfig> = {
  FREE: {
    id: 'free',
    name: 'Free',
    priceId: '',
    price: 0,
    interval: 'month',
    features: [
      'Up to 10 saved contracts',
      'Basic search',
      'Email notifications',
      '1 user',
    ],
    limits: {
      maxUsers: 1,
      maxSavedContracts: 10,
      maxBidsPerMonth: 2,
      maxAIGenerations: 5,
      maxStorageGB: 1,
    },
  },
  STARTER: {
    id: 'starter',
    name: 'Starter',
    priceId: process.env.STRIPE_STARTER_PRICE_ID || 'price_starter_monthly',
    price: 49,
    interval: 'month',
    features: [
      'Up to 50 saved contracts',
      'Advanced search & filters',
      'AI contract matching',
      'Basic proposal generation',
      '3 users',
      'Email & in-app notifications',
      'Calendar integration',
    ],
    limits: {
      maxUsers: 3,
      maxSavedContracts: 50,
      maxBidsPerMonth: 10,
      maxAIGenerations: 25,
      maxStorageGB: 5,
    },
  },
  PROFESSIONAL: {
    id: 'professional',
    name: 'Professional',
    priceId: process.env.STRIPE_PROFESSIONAL_PRICE_ID || 'price_professional_monthly',
    price: 149,
    interval: 'month',
    features: [
      'Unlimited saved contracts',
      'AI-powered bid compilation',
      'BOM generator (3 tiers)',
      'Past performance management',
      '10 users',
      'Team collaboration',
      'Custom analytics',
      'Priority support',
    ],
    limits: {
      maxUsers: 10,
      maxSavedContracts: -1, // Unlimited
      maxBidsPerMonth: 50,
      maxAIGenerations: 100,
      maxStorageGB: 25,
    },
  },
  ENTERPRISE: {
    id: 'enterprise',
    name: 'Enterprise',
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID || 'price_enterprise_monthly',
    price: 499,
    interval: 'month',
    features: [
      'Everything in Professional',
      'Unlimited users',
      'Unlimited AI generations',
      'White-label options',
      'Custom integrations',
      'Dedicated account manager',
      'SLA guarantee',
      'On-premise deployment option',
    ],
    limits: {
      maxUsers: -1, // Unlimited
      maxSavedContracts: -1,
      maxBidsPerMonth: -1,
      maxAIGenerations: -1,
      maxStorageGB: 100,
    },
  },
};

// =============================================================================
// STRIPE CLIENT
// =============================================================================

let stripeClient: Stripe | null = null;

/**
 * Get Stripe client instance (lazy initialization)
 */
export function getStripeClient(): Stripe {
  if (!stripeClient) {
    if (!stripeConfig.secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }

    stripeClient = new Stripe(stripeConfig.secretKey, {
      apiVersion: stripeConfig.apiVersion as Stripe.LatestApiVersion,
      typescript: true,
    });
  }

  return stripeClient;
}

// =============================================================================
// CUSTOMER OPERATIONS
// =============================================================================

/**
 * Create a new Stripe customer
 */
export async function createCustomer(params: {
  email: string;
  name: string;
  organizationId: string;
  metadata?: Record<string, string>;
}): Promise<Stripe.Customer> {
  const stripe = getStripeClient();

  return stripe.customers.create({
    email: params.email,
    name: params.name,
    metadata: {
      organizationId: params.organizationId,
      ...params.metadata,
    },
  });
}

/**
 * Update a Stripe customer
 */
export async function updateCustomer(
  customerId: string,
  params: Stripe.CustomerUpdateParams
): Promise<Stripe.Customer> {
  const stripe = getStripeClient();
  return stripe.customers.update(customerId, params);
}

/**
 * Get a Stripe customer
 */
export async function getCustomer(customerId: string): Promise<Stripe.Customer | null> {
  const stripe = getStripeClient();

  try {
    const customer = await stripe.customers.retrieve(customerId);
    if (customer.deleted) {
      return null;
    }
    return customer as Stripe.Customer;
  } catch (error) {
    if ((error as Stripe.StripeRawError).code === 'resource_missing') {
      return null;
    }
    throw error;
  }
}

/**
 * Delete a Stripe customer
 */
export async function deleteCustomer(customerId: string): Promise<void> {
  const stripe = getStripeClient();
  await stripe.customers.del(customerId);
}

// =============================================================================
// SUBSCRIPTION OPERATIONS
// =============================================================================

/**
 * Create a subscription
 */
export async function createSubscription(params: {
  customerId: string;
  priceId: string;
  trialDays?: number;
  metadata?: Record<string, string>;
}): Promise<Stripe.Subscription> {
  const stripe = getStripeClient();

  const subscriptionParams: Stripe.SubscriptionCreateParams = {
    customer: params.customerId,
    items: [{ price: params.priceId }],
    payment_behavior: 'default_incomplete',
    payment_settings: {
      save_default_payment_method: 'on_subscription',
    },
    expand: ['latest_invoice.payment_intent'],
    metadata: params.metadata,
  };

  if (params.trialDays || stripeConfig.trialDays) {
    subscriptionParams.trial_period_days = params.trialDays || stripeConfig.trialDays;
  }

  return stripe.subscriptions.create(subscriptionParams);
}

/**
 * Update a subscription
 */
export async function updateSubscription(
  subscriptionId: string,
  params: Stripe.SubscriptionUpdateParams
): Promise<Stripe.Subscription> {
  const stripe = getStripeClient();
  return stripe.subscriptions.update(subscriptionId, params);
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(
  subscriptionId: string,
  cancelAtPeriodEnd: boolean = true
): Promise<Stripe.Subscription> {
  const stripe = getStripeClient();

  if (cancelAtPeriodEnd) {
    return stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
  }

  return stripe.subscriptions.cancel(subscriptionId);
}

/**
 * Get a subscription
 */
export async function getSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription | null> {
  const stripe = getStripeClient();

  try {
    return await stripe.subscriptions.retrieve(subscriptionId);
  } catch (error) {
    if ((error as Stripe.StripeRawError).code === 'resource_missing') {
      return null;
    }
    throw error;
  }
}

/**
 * Change subscription plan
 */
export async function changeSubscriptionPlan(
  subscriptionId: string,
  newPriceId: string
): Promise<Stripe.Subscription> {
  const stripe = getStripeClient();

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  return stripe.subscriptions.update(subscriptionId, {
    items: [
      {
        id: subscription.items.data[0].id,
        price: newPriceId,
      },
    ],
    proration_behavior: 'create_prorations',
  });
}

// =============================================================================
// PAYMENT OPERATIONS
// =============================================================================

/**
 * Create a payment intent
 */
export async function createPaymentIntent(params: {
  amount: number;
  customerId: string;
  metadata?: Record<string, string>;
}): Promise<Stripe.PaymentIntent> {
  const stripe = getStripeClient();

  return stripe.paymentIntents.create({
    amount: params.amount,
    currency: stripeConfig.currency,
    customer: params.customerId,
    metadata: params.metadata,
  });
}

/**
 * Create a setup intent for saving payment methods
 */
export async function createSetupIntent(
  customerId: string
): Promise<Stripe.SetupIntent> {
  const stripe = getStripeClient();

  return stripe.setupIntents.create({
    customer: customerId,
    payment_method_types: ['card'],
  });
}

/**
 * List customer's payment methods
 */
export async function listPaymentMethods(
  customerId: string
): Promise<Stripe.PaymentMethod[]> {
  const stripe = getStripeClient();

  const paymentMethods = await stripe.paymentMethods.list({
    customer: customerId,
    type: 'card',
  });

  return paymentMethods.data;
}

/**
 * Set default payment method
 */
export async function setDefaultPaymentMethod(
  customerId: string,
  paymentMethodId: string
): Promise<Stripe.Customer> {
  const stripe = getStripeClient();

  return stripe.customers.update(customerId, {
    invoice_settings: {
      default_payment_method: paymentMethodId,
    },
  });
}

/**
 * Delete a payment method
 */
export async function deletePaymentMethod(
  paymentMethodId: string
): Promise<void> {
  const stripe = getStripeClient();
  await stripe.paymentMethods.detach(paymentMethodId);
}

// =============================================================================
// INVOICE OPERATIONS
// =============================================================================

/**
 * List customer invoices
 */
export async function listInvoices(
  customerId: string,
  limit: number = 10
): Promise<Stripe.Invoice[]> {
  const stripe = getStripeClient();

  const invoices = await stripe.invoices.list({
    customer: customerId,
    limit,
  });

  return invoices.data;
}

/**
 * Get upcoming invoice
 */
export async function getUpcomingInvoice(
  customerId: string
): Promise<Stripe.UpcomingInvoice | null> {
  const stripe = getStripeClient();

  try {
    return await stripe.invoices.retrieveUpcoming({
      customer: customerId,
    });
  } catch (error) {
    if ((error as Stripe.StripeRawError).code === 'invoice_upcoming_none') {
      return null;
    }
    throw error;
  }
}

// =============================================================================
// WEBHOOK HANDLING
// =============================================================================

/**
 * Construct and verify webhook event
 */
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  const stripe = getStripeClient();

  return stripe.webhooks.constructEvent(
    payload,
    signature,
    stripeConfig.webhookSecret
  );
}

/**
 * Webhook event types we handle
 */
export const WebhookEvents = {
  CHECKOUT_COMPLETED: 'checkout.session.completed',
  SUBSCRIPTION_CREATED: 'customer.subscription.created',
  SUBSCRIPTION_UPDATED: 'customer.subscription.updated',
  SUBSCRIPTION_DELETED: 'customer.subscription.deleted',
  INVOICE_PAID: 'invoice.paid',
  INVOICE_PAYMENT_FAILED: 'invoice.payment_failed',
  PAYMENT_SUCCEEDED: 'payment_intent.succeeded',
  PAYMENT_FAILED: 'payment_intent.payment_failed',
} as const;

// =============================================================================
// BILLING PORTAL
// =============================================================================

/**
 * Create a billing portal session
 */
export async function createBillingPortalSession(
  customerId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session> {
  const stripe = getStripeClient();

  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}

// =============================================================================
// CHECKOUT
// =============================================================================

/**
 * Create a checkout session
 */
export async function createCheckoutSession(params: {
  customerId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  trialDays?: number;
  metadata?: Record<string, string>;
}): Promise<Stripe.Checkout.Session> {
  const stripe = getStripeClient();

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    customer: params.customerId,
    payment_method_types: ['card'],
    line_items: [
      {
        price: params.priceId,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: params.metadata,
  };

  if (params.trialDays) {
    sessionParams.subscription_data = {
      trial_period_days: params.trialDays,
    };
  }

  return stripe.checkout.sessions.create(sessionParams);
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validate Stripe configuration
 */
export function validateStripeConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!stripeConfig.secretKey) {
    errors.push('STRIPE_SECRET_KEY is required');
  }

  if (!stripeConfig.publicKey) {
    errors.push('STRIPE_PUBLIC_KEY is required');
  }

  if (!stripeConfig.webhookSecret) {
    errors.push('STRIPE_WEBHOOK_SECRET is required for webhook verification');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get plan by ID
 */
export function getPlanById(planId: string): PlanConfig | undefined {
  return Object.values(subscriptionPlans).find(
    (plan) => plan.id === planId || plan.priceId === planId
  );
}

/**
 * Get plan limits
 */
export function getPlanLimits(planId: string): PlanLimits {
  const plan = getPlanById(planId);
  return plan?.limits || subscriptionPlans.FREE.limits;
}

/**
 * Check if limit is exceeded
 */
export function isLimitExceeded(
  planId: string,
  limitType: keyof PlanLimits,
  currentValue: number
): boolean {
  const limits = getPlanLimits(planId);
  const limit = limits[limitType];

  // -1 means unlimited
  if (limit === -1) {
    return false;
  }

  return currentValue >= limit;
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  config: stripeConfig,
  plans: subscriptionPlans,
  getStripeClient,
  customer: {
    create: createCustomer,
    update: updateCustomer,
    get: getCustomer,
    delete: deleteCustomer,
  },
  subscription: {
    create: createSubscription,
    update: updateSubscription,
    cancel: cancelSubscription,
    get: getSubscription,
    changePlan: changeSubscriptionPlan,
  },
  payment: {
    createIntent: createPaymentIntent,
    createSetupIntent,
    listMethods: listPaymentMethods,
    setDefault: setDefaultPaymentMethod,
    deleteMethod: deletePaymentMethod,
  },
  invoice: {
    list: listInvoices,
    getUpcoming: getUpcomingInvoice,
  },
  webhook: {
    constructEvent: constructWebhookEvent,
    events: WebhookEvents,
  },
  portal: {
    createSession: createBillingPortalSession,
  },
  checkout: {
    createSession: createCheckoutSession,
  },
  getPlanById,
  getPlanLimits,
  isLimitExceeded,
  validateConfig: validateStripeConfig,
};
