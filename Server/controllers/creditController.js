import Transaction from "../models/transaction.js"; // Fix: Import with capital T and rename
import Stripe from "stripe";

const plans = [
	{
		_id: "basic",
		name: "Basic",
		price: 10,
		credits: 100,
		features: [
			"100 text generations",
			"50 image generations",
			"Standard support",
			"Access to basic models",
		],
	},
	{
		_id: "pro",
		name: "Pro",
		price: 20,
		credits: 500,
		features: [
			"100 text generations",
			"200 image generations",
			"Priority support",
			"Access to pro models",
		],
	},
	{
		_id: "premium",
		name: "Premium",
		price: 50,
		credits: 2000,
		features: [
			"1000 text generations",
			"500 image generations",
			"24/7 support",
			"Access to all models",
		],
	},
];

export const getPlans = async (req, res) => {
	try {
		res.json({ success: true, plans });
	} catch (error) {
		return res.json({ success: false, message: error.message });
	}
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const purchasePlan = async (req, res) => {
	try {
		const { planId } = req.body;
		const userId = req.user.id;

		const plan = plans.find((plan) => plan._id === planId);

		if (!plan) {
			return res
				.status(404)
				.json({ success: false, message: "Plan not found" });
		}

		// Fix: Use Transaction (capital T) instead of transaction
		const newTransaction = await Transaction.create({
			userId,
			planId: plan._id,
			amount: plan.price,
			credits: plan.credits,
			isPaid: false, // Fix: Set to false initially, will be updated after payment
		});

		const { origin } = req.headers;

		const session = await stripe.checkout.sessions.create({
			line_items: [
				{
					price_data: {
						// Fix: Use price_data instead of price
						currency: "usd",
						unit_amount: plan.price * 100,
						product_data: {
							name: plan.name,
						},
					},
					quantity: 1,
				},
			],
			mode: "payment",
			success_url: `${origin}/loading`,
			cancel_url: `${origin}`,
			expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
			metadata: {
				transactionId: newTransaction._id.toString(), // Fix: Use newTransaction
				appId: "quickgpt",
			},
		});

		res.json({ success: true, url: session.url });
	} catch (error) {
		console.error("Purchase plan error:", error);
		return res.json({ success: false, message: error.message });
	}
};
