require('dotenv').config();
const Razorpay = require('razorpay');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

async function test() {
  try {
    const result = await razorpay.paymentLink.create({
      amount: 200000,
      currency: "INR",
      description: "Dear Customer, your recent payment of ₹2000.00 could not be processed because your card has expired. Please use this secure link to update your payment method and complete your transaction.",
      customer: {
        name: "Test Customer",
        email: "test@example.com",
        contact: "+919999999999",
      },
      notify: { sms: false, email: false },
      reminder_enable: true,
      reference_id: "test_" + Date.now(),
    });
    console.log("Success:", result.id);
  } catch (err) {
    console.error("Error:", JSON.stringify(err, null, 2));
  }
}
test();
