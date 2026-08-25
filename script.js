const SUPABASE_URL = "https://osiixogirgixgqxfvsgw.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_gYNQ38R5yTs6gmX_o2H_iA_bf6nR1GW";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);

const form = document.getElementById("orderForm");
const message = document.getElementById("message");
const submitButton = form.querySelector("button[type='submit']");

form.addEventListener("submit", async function (event) {

    event.preventDefault();

    const contactName = document.getElementById("contactName").value.trim();
    const server = document.getElementById("server").value.trim();
    const gold = Number(document.getElementById("gold").value);
    const notes = document.getElementById("notes").value.trim();

    if (!contactName || !server || !gold || gold <= 0) {
        message.innerHTML = `
            <p>Please complete all required fields.</p>
        `;
        return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "SUBMITTING...";

    message.innerHTML = "";

    try {

        const { data, error } = await supabaseClient.rpc(
            "create_customer_order",
            {
                p_contact_name: contactName,
                p_server: server,
                p_requested_gold: gold,
                p_notes: notes || null
            }
        );

        if (error) {
            throw error;
        }

       const chatLink =
    `chat.html?order=${data.order_id}&token=${encodeURIComponent(data.access_token)}`;

message.innerHTML = `
    <div style="margin-top:20px;">

        <h3>ORDER RECEIVED</h3>

        <p>
            Your order has been submitted successfully.
        </p>

        <p>
            <strong>Order Number:</strong><br>
            ${data.order_number}
        </p>

        <p>
            You can now open your private order chat.
        </p>

        <button
            type="button"
            onclick="window.location.href='${chatLink}'"
        >
            OPEN MY ORDER
        </button>

        <p style="font-size:12px; color:#9ca3af; margin-top:15px;">
            Please save this order link.
            It is your private access to this order.
        </p>

    </div>
`;

        form.reset();

    } catch (error) {

        console.error("Order submission error:", error);

        message.innerHTML = `
            <p>
                Something went wrong while submitting your order.
                Please try again.
            </p>
        `;

    } finally {

        submitButton.disabled = false;
        submitButton.textContent = "SUBMIT ORDER";

    }

});
