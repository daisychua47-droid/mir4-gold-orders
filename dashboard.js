const SUPABASE_URL = "https://osiixogirgixgqxfvsgw.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_gYNQ38R5yTs6gmX_o2H_iA_bf6nR1GW";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);


const ordersContainer =
    document.getElementById("orders");

const refreshButton =
    document.getElementById("refreshButton");

const logoutButton =
    document.getElementById("logoutButton");


// ===============================
// CHECK ADMIN LOGIN
// ===============================

async function checkAdmin() {

    const {
        data: { user }
    } = await supabaseClient.auth.getUser();


    if (!user) {

        window.location.href = "admin.html";

        return null;
    }


    const { data, error } =
        await supabaseClient
            .from("admin_users")
            .select("id")
            .eq("id", user.id)
            .maybeSingle();


    if (error || !data) {

        await supabaseClient.auth.signOut();

        window.location.href = "admin.html";

        return null;
    }


    return user;
}


// ===============================
// LOAD ORDERS
// ===============================

async function loadOrders() {

    ordersContainer.innerHTML = `
        <div class="loading">
            Loading orders...
        </div>
    `;


    const { data, error } =
        await supabaseClient
            .from("orders")
            .select(`
                id,
                order_number,
                server,
                requested_gold,
                status,
                notes,
                created_at,
                customer_id,
                customers (
                    contact_name
                )
            `)
            .is("deleted_at", null)
            .order("created_at", {
                ascending: false
            });


    if (error) {

        console.error(error);

        ordersContainer.innerHTML = `
            <div class="error">
                Unable to load orders.
                <br><br>
                ${escapeHtml(error.message)}
            </div>
        `;

        return;
    }


    if (!data || data.length === 0) {

        ordersContainer.innerHTML = `
            <div class="empty">
                No orders yet.
            </div>
        `;

        return;
    }


    renderOrders(data);
}


// ===============================
// RENDER ORDERS
// ===============================

function renderOrders(orders) {

    ordersContainer.innerHTML = "";


    orders.forEach(order => {

        const card =
            document.createElement("div");

        card.className = "order-card";


        const customerName =
            order.customers?.contact_name || "Unknown";


        const created =
            new Date(order.created_at)
                .toLocaleString();


        const isClosed =
            order.status === "CLOSED";


        card.innerHTML = `

            <div class="order-top">

                <div class="order-number">
                    ${escapeHtml(order.order_number)}
                </div>

                <div class="status">
                    ${escapeHtml(order.status)}
                </div>

            </div>


            <div class="info">

                <div>
                    Customer
                    <strong>
                        ${escapeHtml(customerName)}
                    </strong>
                </div>

                <div>
                    Server
                    <strong>
                        ${escapeHtml(order.server)}
                    </strong>
                </div>

                <div>
                    Gold
                    <strong>
                        ${Number(order.requested_gold).toLocaleString()} G
                    </strong>
                </div>

                <div>
                    Created
                    <strong>
                        ${escapeHtml(created)}
                    </strong>
                </div>

            </div>


            <div class="actions">

                <button
                    class="open"
                    onclick="openOrder(${order.id})"
                >
                    OPEN CHAT
                </button>


                ${
                    isClosed
                    ?
                    `
                    <button
                        class="close"
                        onclick="reopenOrder(${order.id})"
                    >
                        REOPEN
                    </button>
                    `
                    :
                    `
                    <button
                        class="close"
                        onclick="closeOrder(${order.id})"
                    >
                        CLOSE
                    </button>
                    `
                }


                <button
                    class="delete"
                    onclick="deleteOrder(${order.id})"
                >
                    DELETE
                </button>

            </div>

        `;


        ordersContainer.appendChild(card);
    });
}


// ===============================
// OPEN CHAT
// ===============================

function openOrder(orderId) {

    window.location.href =
        `admin-chat.html?order=${orderId}`;
}


// ===============================
// CLOSE ORDER
// ===============================

async function closeOrder(orderId) {

    if (!confirm(
        "Close this order?"
    )) {
        return;
    }


    const { error } =
        await supabaseClient
            .from("orders")
            .update({
                status: "CLOSED",
                updated_at: new Date().toISOString()
            })
            .eq("id", orderId);


    if (error) {

        alert(
            "Unable to close order."
        );

        console.error(error);

        return;
    }


    loadOrders();
}


// ===============================
// REOPEN ORDER
// ===============================

async function reopenOrder(orderId) {

    if (!confirm(
        "Reopen this order?"
    )) {
        return;
    }


    const { error } =
        await supabaseClient
            .from("orders")
            .update({
                status: "WAITING",
                updated_at: new Date().toISOString()
            })
            .eq("id", orderId);


    if (error) {

        alert(
            "Unable to reopen order."
        );

        console.error(error);

        return;
    }


    loadOrders();
}


// ===============================
// DELETE ORDER
// ===============================

async function deleteOrder(orderId) {

    if (!confirm(
        "DELETE this order permanently?\n\n" +
        "This will permanently delete:\n" +
        "• The order\n" +
        "• All chat messages\n\n" +
        "This cannot be undone."
    )) {
        return;
    }

    const { error } =
        await supabaseClient
            .from("orders")
            .delete()
            .eq("id", orderId);

    if (error) {

        alert(
            "Unable to permanently delete order."
        );

        console.error(error);

        return;
    }

    // Refresh order list
    await loadOrders();

}
// ===============================
// LOGOUT
// ===============================

logoutButton.addEventListener(
    "click",
    async function() {

        await supabaseClient.auth.signOut();

        window.location.href =
            "admin.html";

    }
);


// ===============================
// REFRESH
// ===============================

refreshButton.addEventListener(
    "click",
    loadOrders
);


// ===============================
// ESCAPE HTML
// ===============================

function escapeHtml(text) {

    const div =
        document.createElement("div");

    div.textContent =
        text ?? "";

    return div.innerHTML;
}


// ===============================
// START
// ===============================

async function start() {

    const user =
        await checkAdmin();


    if (!user) {
        return;
    }


    await loadOrders();
}


start();
