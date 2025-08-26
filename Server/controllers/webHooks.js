import { response } from "express";
import Stripe from "stripe";
import Transaction from "../models/transactionModel.js";
import User from "../models/user";

export const stripeWebhooks = async (req, res) => {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const sig = req.headers["stripe-signature"];

    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (error) {
        return response.status(400).send(`Webhook Error: ${error.message}`);
    }

    try {
        switch(event.type) {
            case "payment_intent.succeeded":{
                const paymentIntent = event.data.object;
                const sessionList = await stripe.checkout.sessions.list({
                    payment_intent: paymentIntent.id
                });
                const session = sessionList.data[0];
                const { transactionId , appId } = session.metadata;

                if(appId === 'quickgpt' )
                {
                    const transaction = await Transaction.findById(transactionId);

                    await User.updateOne({_id: transaction.userId},{credits: transaction.credits})

                    transaction.isPaid = true;
                    await transaction.save();
                }
                else{
                    return response.status(400).json({success: false, message: "Invalid App ID"});
                }
                break;
            }
            default:
                console.log(`Unhandled event type ${event.type}`);
                break;
        }
        response.json({received: true});
    } catch (error) {
        console.error("Webhook processing error:");
        response.status(500).json({success: false, message: error.message});
    }
}