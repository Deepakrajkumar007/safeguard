// Demo examples. Phone numbers use the 555-01xx range reserved for fiction.
export interface Example {
  id: string;
  label: string;
  text: string;
}

export const EXAMPLES: Example[] = [
  {
    id: "bank",
    label: "Fake bank text",
    text: "Chase Alert: Your account has been locked due to unusual activity. Verify your identity within 24 hours to avoid suspension: https://chase-secure-login.top/verify",
  },
  {
    id: "package",
    label: "Package text",
    text: "USPS: Your package could not be delivered due to an incomplete address. Update now to avoid return: https://usps.com-redelivery.info/track",
  },
  {
    id: "grandkid",
    label: "Grandkid in trouble",
    text: "Grandma it's me. I was in a car accident and I'm in jail. Please don't tell Mom. I need $2,000 for bail right away. Can you get gift cards?",
  },
  {
    id: "money",
    label: "Money offer",
    text: "Deposit $100 today and get $3,000 back guaranteed! Text me on WhatsApp to start.",
  },
  {
    id: "toll",
    label: "Toll bill",
    text: "E-ZPass: You have an unpaid toll balance of $6.99. Pay within 24 hours to avoid late fees: https://ezpass-tolls.xyz/pay",
  },
  {
    id: "real",
    label: "Real Chase link",
    text: "https://secure.chase.com/web/auth/dashboard",
  },
];
