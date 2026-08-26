const SUPABASE_URL =
    "https://osiixogirgixgqxfvsgw.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_gYNQ38R5yTs6gmX_o2H_iA_bf6nR1GW";

const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY
    );


const ordersContainer =
    document.getElementById("orders");

const refreshButton =
    document.getElementById("refreshButton");

const logoutButton =
    document.getElementById("logoutButton");


// ======================================
// CHECK ADMIN LOGIN
// ======================================

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


// ======================================
// LOAD ORDERS
// ======================================

async function loadOrders() {

    ordersContainer.innerHTML = `
        <div class="loading">
            Loading orders...
        </div>
    `;


    const {
        data: { user }
    } = await supabaseClient.auth.getUser();


    if (!user) {
        return;
    }


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
                admin_last_read_at,
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


    // Load unread counts
    const ordersWithUnread =
        await Promise.all(
            data.map(
                async order => {

                    const unread =
                        await getUnreadCount(order);

                    return {
                        ...order,
                        unreadMessages:
                            unread.messages,
                        unreadImages:
                            unread.images
                    };
                }
            )
        );


    renderOrders(ordersWithUnread);
}


// ======================================
// GET UNREAD COUNT
// ======================================

async function getUnreadCount(order) {

    const lastRead =
        order.admin_last_read_at
            ? new Date(order.admin_last_read_at)
            : new Date(0);


    // ------------------------------
    // CUSTOMER MESSAGES
    // ------------------------------

    const {
        count: messageCount,
        error: messageError
    } =
        await supabaseClient
            .from("order_messages")
            .select(
                "id",
                {
                    count: "exact",
                    head: true
                }
            )
            .eq("order_id", order.id)
            .eq("sender_type", "customer")
            .gt(
                "created_at",
                lastRead.toISOString()
            );


    if (messageError) {

        console.error(
            "Unread message error:",
            messageError
        );
    }


    // ------------------------------
    // CUSTOMER SCREENSHOTS
    // ------------------------------

    const {
        count: imageCount,
        error: imageError
    } =
        await supabaseClient
            .from("order_screenshots")
            .select(
                "id",
                {
                    count: "exact",
                    head: true
                }
            )
            .eq("order_id", order.id)
            .eq("sender_type", "customer")
            .gt(
                "created_at",
                lastRead.toISOString()
            );


    if (imageError) {

        console.error(
            "Unread image error:",
            imageError
        );
    }


    return {

        messages:
            messageCount || 0,

        images:
            imageCount || 0
    };
}


// ======================================
// RENDER ORDERS
// ======================================

function renderOrders(orders) {

    ordersContainer.innerHTML = "";


    orders.forEach(order => {

        const card =
            document.createElement("div");

        card.className =
            "order-card";


        const customerName =
            order.customers?.contact_name ||
            "Unknown";


        const created =
            new Date(order.created_at)
                .toLocaleString();


        const isClosed =
            order.status === "CLOSED";


        const totalUnread =
            order.unreadMessages +
            order.unreadImages;


        let notificationHTML = "";


        if (totalUnread > 0) {

            notificationHTML = `

                <div class="notification">

                    <span class="notification-dot">
                        ●
                    </span>

                    <strong>
                        ${totalUnread}
                        NEW
                    </strong>

                    ${
                        order.unreadMessages > 0
                        ?
                        `
                        <span>
                            💬 ${order.unreadMessages}
                        </span>
                        `
                        :
                        ""
                    }

                    ${
                        order.unreadImages > 0
                        ?
                        `
                        <span>
                            📷 ${order.unreadImages}
                        </span>
                        `
                        :
                        ""
                    }

                </div>

            `;
        }


        card.innerHTML = `

            <div class="order-top">

                <div class="order-number">
                    ${escapeHtml(
                        order.order_number
                    )}
                </div>

                <div class="status">
                    ${escapeHtml(
                        order.status
                    )}
                </div>

            </div>


            ${notificationHTML}


            <div class="info">

                <div>
                    Customer

                    <strong>
                        ${escapeHtml(
                            customerName
                        )}
                    </strong>
                </div>


                <div>
                    Server

                    <strong>
                        ${escapeHtml(
                            order.server
                        )}
                    </strong>
                </div>


                <div>
                    Gold

                    <strong>
                        ${
                            Number(
                                order.requested_gold
                            ).toLocaleString()
                        }
                        G
                    </strong>
                </div>


                <div>
                    Created

                    <strong>
                        ${escapeHtml(
                            created
                        )}
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


// ======================================
// OPEN CHAT
// ======================================

function openOrder(orderId) {

    window.location.href =
        `admin-chat.html?order=${orderId}`;
}


// ======================================
// CLOSE ORDER
// ======================================

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
                updated_at:
                    new Date().toISOString()
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


// ======================================
// REOPEN ORDER
// ======================================

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
                updated_at:
                    new Date().toISOString()
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


// ======================================
// DELETE ORDER
// ======================================

async function deleteOrder(orderId) {

    const confirmed =
        confirm(
            "DELETE this order?\n\n" +
            "This will permanently delete:\n" +
            "• Order\n" +
            "• Messages\n" +
            "• Order items\n" +
            "• Screenshots\n" +
            "• Customer information\n\n" +
            "This cannot be undone."
        );


    if (!confirmed) {
        return;
    }


    try {

        const {
            data,
            error
        } =
            await supabaseClient.rpc(
                "delete_order",
                {
                    p_order_id:
                        Number(orderId)
                }
            );


        if (error) {

            console.error(
                "Delete error:",
                error
            );

            alert(
                "Unable to delete order.\n\n" +
                error.message
            );

            return;
        }


        console.log(
            "Order deleted:",
            data
        );


        await loadOrders();

    }

    catch (err) {

        console.error(err);

        alert(
            "An unexpected error occurred while deleting the order."
        );
    }
}


// ======================================
// LOGOUT
// ======================================

logoutButton.addEventListener(
    "click",
    async function() {

        await supabaseClient
            .auth
            .signOut();

        window.location.href =
            "admin.html";

    }
);


// ======================================
// REFRESH
// ======================================

refreshButton.addEventListener(
    "click",
    loadOrders
);


// ======================================
// REALTIME — NEW MESSAGES
// ======================================

const messageChannel =
    supabaseClient
        .channel(
            "admin-dashboard-messages"
        )
        .on(
            "postgres_changes",
            {
                event: "INSERT",
                schema: "public",
                table: "order_messages"
            },
            function(payload) {

                console.log(
                    "New message:",
                    payload.new
                );

                loadOrders();

                playNotificationSound();
            }
        )
        .subscribe();


// ======================================
// REALTIME — NEW SCREENSHOTS
// ======================================

const screenshotChannel =
    supabaseClient
        .channel(
            "admin-dashboard-screenshots"
        )
        .on(
            "postgres_changes",
            {
                event: "INSERT",
                schema: "public",
                table: "order_screenshots"
            },
            function(payload) {

                console.log(
                    "New screenshot:",
                    payload.new
                );

                loadOrders();

                playNotificationSound();
            }
        )
        .subscribe();


// ======================================
// NOTIFICATION SOUND
// ======================================

function playNotificationSound() {

    try {

        const audioContext =
            new (
                window.AudioContext ||
                window.webkitAudioContext
            )();


        const oscillator =
            audioContext.createOscillator();


        const gain =
            audioContext.createGain();


        oscillator.frequency.value =
            880;

        oscillator.type =
            "sine";


        gain.gain.setValueAtTime(
            0.001,
            audioContext.currentTime
        );


        gain.gain.exponentialRampToValueAtTime(
            0.15,
            audioContext.currentTime + 0.01
        );


        gain.gain.exponentialRampToValueAtTime(
            0.001,
            audioContext.currentTime + 0.25
        );


        oscillator.connect(gain);

        gain.connect(
            audioContext.destination
        );


        oscillator.start();

        oscillator.stop(
            audioContext.currentTime + 0.25
        );

    }

    catch (error) {

        console.log(
            "Notification sound unavailable."
        );
    }
}


// ======================================
// ESCAPE HTML
// ======================================

function escapeHtml(text) {

    const div =
        document.createElement("div");

    div.textContent =
        text ?? "";

    return div.innerHTML;
}


// ======================================
// START
// ======================================

async function start() {

    const user =
        await checkAdmin();


    if (!user) {
        return;
    }


    await loadOrders();
}


start();
