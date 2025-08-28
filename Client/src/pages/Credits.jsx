import React, { useState, useEffect } from "react";
import Loading from "./Loading";
import toast from "react-hot-toast";
import { useAppContext } from "../context/AppContext";

function Credits() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const { axios, token, user } = useAppContext(); // Add user to get current credits

  const fetchPlans = async () => {
    try {
      console.log("Fetching plans..."); // Debug log
      const { data } = await axios.get("/api/credit/plan", { // Keep as /plan
        headers: { Authorization: token },
      });
      
      console.log("Plans response:", data); // Debug log
      
      if (data.success) {
        setPlans(data.plans);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error("Fetch plans error:", error); // Better error logging
      toast.error(error.response?.data?.message || error.message);
    }
    setLoading(false);
  };

  const purchasePlane = async (planId) => {
    try {
      console.log("Purchasing plan:", planId); // Debug log
      const { data } = await axios.post(
        "/api/credit/purchase",
        { planId },
        {
          headers: { Authorization: token },
        }
      );
      
      console.log("Purchase response:", data); // Debug log
      
      if (data.success) {
        toast.success("Redirecting to payment...");
        window.location.href = data.url;
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error("Purchase error:", error); // Better error logging
      toast.error(error.response?.data?.message || error.message);
    }
  };

  useEffect(() => {
    if (token) { // Only fetch if user is logged in
      fetchPlans();
    } else {
      setLoading(false);
      toast.error("Please login to view credit plans");
    }
  }, [token]); // Add token dependency

  if (loading) return <Loading />;

  return (
    <div className="max-w-7xl h-screen overflow-y-scroll mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h2 className="text-3xl font-semibold text-center mb-10 xl:mt-30 text-gray-800 dark:text-white">
        Credit Plans
      </h2>
      
      {/* Add current credits display */}
      {user && (
        <div className="text-center mb-8">
          <p className="text-lg text-gray-600 dark:text-purple-200">
            Current Credits: <span className="font-bold text-purple-600 dark:text-purple-300">{user.credits || 0}</span>
          </p>
        </div>
      )}

      <div className="flex flex-wrap justify-center gap-8">
        {plans.map((plan) => (
          <div
            key={plan._id} // Change from plan.id to plan._id to match your server data
            className={`border border-gray-200 dark:border-purple-700 rounded-lg shadow hover:shadow-lg transition-shadow p-6 min-w-[300px] flex flex-col ${
              plan._id === "pro" // Change from plan.id to plan._id
                ? "bg-purple-50 dark:bg-purple-900"
                : "bg-white dark:bg-transparent"
            }`}
          >
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {plan.name}
              </h3>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-300 mb-4">
                ${plan.price}
                <span className="text-base font-normal text-gray-600 dark:text-purple-200">
                  {" "}
                  /{plan.credits} credits
                </span>
              </p>
              <ul className="list-disc list-inside text-sm text-gray-700 dark:text-purple-200 space-y-1">
                {plan.features.map((feature, index) => (
                  <li key={index}>{feature}</li>
                ))}
              </ul>
            </div>
            <button 
              onClick={() => toast.promise(purchasePlane(plan._id), { // Change from plan.id to plan._id
                loading: "Purchasing...",
                success: "Redirecting to payment...",
                error: "Purchase failed"
              })} 
              className="mt-6 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-medium py-2 rounded transition-colors cursor-pointer"
            >
              Buy Now
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Credits;
