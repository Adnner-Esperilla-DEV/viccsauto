export interface PaymentProvider {
  readonly name: string;
  create(amount: number, currency: string, reference: string): Promise<{ providerId: string; status: "PENDING" }>;
}

export interface ShippingProvider {
  readonly name: string;
  quote(input: { commune: string; subtotal: number; pickup: boolean }): Promise<number>;
}

export interface MailProvider {
  send(message: { to: string; subject: string; text: string }): Promise<void>;
}

export const manualPaymentProvider: PaymentProvider = {
  name: "MANUAL",
  async create(_amount, _currency, reference) {
    return { providerId: `manual-${reference}`, status: "PENDING" };
  },
};

export const logMailProvider: MailProvider = {
  async send(message) {
    if (process.env.NODE_ENV === "development") console.info(`[mail sandbox] ${message.subject} -> ${message.to}`);
  },
};
