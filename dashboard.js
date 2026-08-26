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


let currentAdminId = null;

let realtimeChannel = null;

let unreadCounts = {};

let originalTitle =
    document.title;


// =====================================================
// CHECK ADMIN LOGIN
// =====================================================

async function checkAdmin() {

    const {
        data: {
            user
        },
        error
    } =
        await supabaseClient.auth.getUser();


    if (error || !user) {

        window.location.href =
            "admin.html";

        return null;
    }


    const {
        data,
        error: adminError
    } =
        await supabaseClient
            .from("admin_users")
            .select("id")
            .eq("id", user.id)
            .maybeSingle();


    if (
        adminError ||
        !data
    ) {

        await supabaseClient.auth.signOut();

        window.location.href =
            "admin.html";

        return null;
    }


    currentAdminId =
        user.id;


    return user;
}


// =====================================================
// LOAD UNREAD COUNTS
// =====================================================

async function loadUnreadCounts() {

    unreadCounts = {};


    if (!currentAdminId) {
        return;
    }


    const {
        data,
        error
    } =
        await supabaseClient
            .from("admin_order_reads")
            .select(
                "order_id, last_read_at"
            )
            .eq(
                "admin_id",
                currentAdminId
            );


    if (error) {

        console.error(
            "Unable to load read status:",
            error
        );

        return;
    }


    if (!data || data.length === 0) {
        return;
    }


    /*
     * Get all customer messages and images.
     */

    const [
        messagesResult,
        imagesResult
    ] =
        await Promise.all([

            supabaseClient
                .from("order_messages")
                .select(
                    "order_id, created_at, sender_type"
                )
                .eq(
                    "sender_type",
                    "customer"
                ),

            supabaseClient
                .from("order_screenshots")
                .select(
                    "order_id, created_at, sender_type"
                )
                .eq(
                    "sender_type",
                    "customer"
                )
        ]);


    if (messagesResult.error) {

        console.error(
            "Unread messages error:",
            messagesResult.error
        );

        return;
    }


    if (imagesResult.error) {

        console.error(
            "Unread images error:",
            imagesResult.error
        );

        return;
    }


    const items = [

        ...(messagesResult.data || [])
            .map(item => ({
                order_id:
                    item.order_id,

                created_at:
                    item.created_at
            })),

        ...(imagesResult.data || [])
            .map(item => ({
                order_id:
                    item.order_id,

                created_at:
                    item.created_at
            }))
    ];


    /*
     * Count everything newer than last_read_at.
     */

    data.forEach(read => {

        const lastRead =
            new Date(
                read.last_read_at
            );


        const count =
            items.filter(item => {

                return (
                    Number(
                        item.order_id
                    ) ===
                    Number(
                        read.order_id
                    )
                    &&
                    new Date(
                        item.created_at
                    ) >
                    lastRead
                );

            }).length;


        if (count > 0) {

            unreadCounts[
                read.order_id
            ] = count;
        }

    });
}


// =====================================================
// LOAD ORDERS
// =====================================================

async function loadOrders() {

    ordersContainer.innerHTML = `
        <div class="loading">
            Loading orders...
        </div>
    `;


    const {
        data,
        error
    } =
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
            .is(
                "deleted_at",
                null
            )
            .order(
                "created_at",
                {
                    ascending: false
                }
            );


    if (error) {

        console.error(error);


        ordersContainer.innerHTML = `
            <div class="error">
                Unable to load orders.
                <br><br>
                ${escapeHtml(
                    error.message
                )}
            </div>
        `;

        return;
    }


    await loadUnreadCounts();


    if (
        !data ||
        data.length === 0
    ) {

        ordersContainer.innerHTML = `
            <div class="empty">
                No orders yet.
            </div>
        `;

        return;
    }


    renderOrders(data);
}


// =====================================================
// RENDER ORDERS
// =====================================================

function renderOrders(
    orders
) {

    ordersContainer.innerHTML =
        "";


    orders.forEach(order => {

        const card =
            document.createElement(
                "div"
            );


        card.className =
            "order-card";


        const customerName =
            order.customers?.contact_name ||
            "Unknown";


        const created =
            new Date(
                order.created_at
            ).toLocaleString();


        const isClosed =
            order.status ===
            "CLOSED";


        const unread =
            unreadCounts[
                order.id
            ] || 0;


        const unreadBadge =
            unread > 0
                ?
                `
                <span
                    class="unread-badge"
                >
                    🔴 ${unread} NEW
                </span>
                `
                :
                "";


        card.innerHTML = `

            <div class="order-top">

                <div
                    class="order-number"
                >
                    ${escapeHtml(
                        order.order_number
                    )}

                    ${unreadBadge}

                </div>

                <div class="status">
                    ${escapeHtml(
                        order.status
                    )}
                </div>

            </div>


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


        ordersContainer.appendChild(
            card
        );
    });
}


// =====================================================
// OPEN CHAT
// =====================================================

async function openOrder(
    orderId
) {

    await markOrderAsRead(
        orderId
    );


    window.location.href =
        `admin-chat.html?order=${orderId}`;
}


// =====================================================
// MARK ORDER READ
// =====================================================

async function markOrderAsRead(
    orderId
) {

    if (!currentAdminId) {
        return;
    }


    const {
        error
    } =
        await supabaseClient
            .from("admin_order_reads")
            .upsert(
                {
                    admin_id:
                        currentAdminId,

                    order_id:
                        Number(orderId),

                    last_read_at:
                        new Date()
                            .toISOString()
                },
                {
                    onConflict:
                        "admin_id,order_id"
                }
            );


    if (error) {

        console.error(
            "Unable to mark order read:",
            error
        );

        return;
    }


    unreadCounts[
        orderId
    ] = 0;
}


// =====================================================
// REALTIME
// =====================================================

function subscribeToRealtime() {

    if (realtimeChannel) {

        supabaseClient.removeChannel(
            realtimeChannel
        );

        realtimeChannel =
            null;
    }


    realtimeChannel =
        supabaseClient
            .channel(
                "admin-dashboard-" +
                Date.now()
            );


    // =================================================
    // CUSTOMER TEXT MESSAGE
    // =================================================

    realtimeChannel.on(
        "postgres_changes",
        {
            event: "INSERT",
            schema: "public",
            table: "order_messages",
            filter:
                "sender_type=eq.customer"
        },
        async payload => {

            console.log(
                "NEW CUSTOMER MESSAGE:",
                payload.new
            );


            const orderId =
                Number(
                    payload.new.order_id
                );


            await incrementUnread(
                orderId
            );


            await loadOrders();


            notifyAdmin(
                "New Customer Message",
                "A customer sent a new message."
            );
        }
    );


    // =================================================
    // CUSTOMER IMAGE
    // =================================================

    realtimeChannel.on(
        "postgres_changes",
        {
            event: "INSERT",
            schema: "public",
            table: "order_screenshots",
            filter:
                "sender_type=eq.customer"
        },
        async payload => {

            console.log(
                "NEW CUSTOMER IMAGE:",
                payload.new
            );


            const orderId =
                Number(
                    payload.new.order_id
                );


            await incrementUnread(
                orderId
            );


            await loadOrders();


            notifyAdmin(
                "New Customer Image",
                payload.new.original_name ||
                "Customer sent an image."
            );
        }
    );


    realtimeChannel.subscribe(
        status => {

            console.log(
                "Dashboard realtime:",
                status
            );


            if (
                status ===
                "SUBSCRIBED"
            ) {

                console.log(
                    "✓ DASHBOARD REALTIME CONNECTED"
                );
            }

        }
    );
}


// =====================================================
// INCREMENT UNREAD
// =====================================================

async function incrementUnread(
    orderId
) {

    unreadCounts[
        orderId
    ] =
        (
            unreadCounts[
                orderId
            ] || 0
        ) + 1;
}


// =====================================================
// ADMIN NOTIFICATION
// =====================================================

async function notifyAdmin(
    title,
    body
) {

    console.log(
        title,
        body
    );


    document.title =
        "🔔 " +
        title;


    setTimeout(
        () => {

            document.title =
                originalTitle;

        },
        5000
    );


    /*
     * Browser notification.
     */

    if (
        "Notification" in window &&
        Notification.permission ===
        "granted"
    ) {

        try {

            new Notification(
                title,
                {
                    body:
                        body,

                    icon:
                        "/mir4-gold-orders/favicon.ico",

                    tag:
                        "mir4-admin"
                }
            );

        } catch (error) {

            console.error(
                error
            );
        }
    }


    playNotificationSound();
}


// =====================================================
// NOTIFICATION SOUND
// =====================================================

function playNotificationSound() {

    try {

        const AudioContext =
            window.AudioContext ||
            window.webkitAudioContext;


        if (!AudioContext) {
            return;
        }


        const audioContext =
            new AudioContext();


        const oscillator =
            audioContext.createOscillator();


        const gain =
            audioContext.createGain();


        oscillator.type =
            "sine";


        oscillator.frequency.value =
            880;


        gain.gain.setValueAtTime(
            0.001,
            audioContext.currentTime
        );


        gain.gain.exponentialRampToValueAtTime(
            0.15,
            audioContext.currentTime +
            0.02
        );


        gain.gain.exponentialRampToValueAtTime(
            0.001,
            audioContext.currentTime +
            0.25
        );


        oscillator.connect(
            gain
        );


        gain.connect(
            audioContext.destination
        );


        oscillator.start();


        oscillator.stop(
            audioContext.currentTime +
            0.25
        );


    } catch (error) {

        console.log(
            "Notification sound unavailable."
        );
    }
}


// =====================================================
// ENABLE NOTIFICATIONS
// =====================================================

async function enableNotifications() {

    if (
        !("Notification" in window)
    ) {

        return;
    }


    if (
        Notification.permission ===
        "default"
    ) {

        try {

            await Notification.requestPermission();

        } catch (error) {

            console.error(
                error
            );
        }
    }
}


// =====================================================
// CLOSE ORDER
// =====================================================

async function closeOrder(
    orderId
) {

    if (
        !confirm(
            "Close this order?"
        )
    ) {

        return;
    }


    const {
        error
    } =
        await supabaseClient
            .from("orders")
            .update({

                status:
                    "CLOSED",

                updated_at:
                    new Date()
                        .toISOString()

            })
            .eq(
                "id",
                orderId
            );


    if (error) {

        alert(
            "Unable to close order."
        );


        console.error(
            error
        );


        return;
    }


    loadOrders();
}


// =====================================================
// REOPEN ORDER
// =====================================================

async function reopenOrder(
    orderId
) {

    if (
        !confirm(
            "Reopen this order?"
        )
    ) {

        return;
    }


    const {
        error
    } =
        await supabaseClient
            .from("orders")
            .update({

                status:
                    "WAITING",

                updated_at:
                    new Date()
                        .toISOString()

            })
            .eq(
                "id",
                orderId
            );


    if (error) {

        alert(
            "Unable to reopen order."
        );


        console.error(
            error
        );


        return;
    }


    loadOrders();
}


// =====================================================
// DELETE ORDER
// =====================================================

async function deleteOrder(
    orderId
) {

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


        delete unreadCounts[
            orderId
        ];


        await loadOrders();


    } catch (err) {

        console.error(
            err
        );


        alert(
            "An unexpected error occurred while deleting the order."
        );
    }
}


// =====================================================
// LOGOUT
// =====================================================

logoutButton.addEventListener(
    "click",
    async function() {

        if (realtimeChannel) {

            await supabaseClient
                .removeChannel(
                    realtimeChannel
                );
        }


        await supabaseClient
            .auth
            .signOut();


        window.location.href =
            "admin.html";

    }
);


// =====================================================
// REFRESH
// =====================================================

refreshButton.addEventListener(
    "click",
    loadOrders
);


// =====================================================
// ESCAPE HTML
// =====================================================

function escapeHtml(
    text
) {

    const div =
        document.createElement(
            "div"
        );


    div.textContent =
        text ?? "";


    return div.innerHTML;
}


// =====================================================
// START
// =====================================================

async function start() {

    const user =
        await checkAdmin();


    if (!user) {
        return;
    }


    await enableNotifications();


    await loadOrders();


    subscribeToRealtime();

}


start();
