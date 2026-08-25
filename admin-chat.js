const SUPABASE_URL =
    "https://osiixogirgixgqxfvsgw.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_gYNQ38R5yTs6gmX_o2H_iA_bf6nR1GW";

const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY
    );

const params =
    new URLSearchParams(window.location.search);

const orderId =
    Number(params.get("order"));

const loading =
    document.getElementById("loading");

const errorBox =
    document.getElementById("error");

const content =
    document.getElementById("content");

const orderNumber =
    document.getElementById("orderNumber");

const customer =
    document.getElementById("customer");

const server =
    document.getElementById("server");

const gold =
    document.getElementById("gold");

const status =
    document.getElementById("status");

const messagesBox =
    document.getElementById("messages");

const composer =
    document.getElementById("composer");

const messageInput =
    document.getElementById("messageInput");

const sendButton =
    document.getElementById("sendButton");

const closedMessage =
    document.getElementById("closedMessage");


// ==============================
// CHECK ADMIN
// ==============================

async function checkAdmin() {

    try {

        const {
            data: {
                user
            },
            error
        } =
            await supabaseClient.auth.getUser();

        if (error) {
            throw error;
        }

        if (!user) {

            window.location.href =
                "admin.html";

            return false;
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


        if (adminError) {
            throw adminError;
        }


        if (!data) {

            window.location.href =
                "admin.html";

            return false;
        }


        return true;

    } catch (error) {

        console.error(
            "Admin check error:",
            error
        );

        showError(
            "Admin verification failed.<br><br>" +
            escapeHtml(error.message)
        );

        return false;
    }
}


// ==============================
// LOAD ORDER
// ==============================

async function loadOrder() {

    if (!orderId) {

        showError(
            "Invalid order ID."
        );

        return;
    }


    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .from("orders")
                .select("*")
                .eq("id", orderId)
                .maybeSingle();


        if (error) {
            throw error;
        }


        if (!data) {

            showError(
                "Order not found."
            );

            return;
        }


        console.log(
            "ORDER:",
            data
        );


        orderNumber.textContent =
            data.order_number ||
            data.id ||
            "-";


        customer.textContent =
            data.customer_name ||
            data.customer ||
            data.name ||
            "Customer";


        server.textContent =
            data.server ||
            "-";


        gold.textContent =
            Number(
                data.requested_gold ||
                data.gold ||
                0
            ).toLocaleString() +
            " G";


        status.textContent =
            data.status ||
            "-";


        await loadMessages();
        await loadImages();


        if (
            String(data.status)
                .toUpperCase() ===
            "CLOSED"
        ) {

            composer.style.display =
                "none";

            closedMessage.style.display =
                "block";

        } else {

            composer.style.display =
                "flex";

            closedMessage.style.display =
                "none";
        }


        loading.style.display =
            "none";

        errorBox.style.display =
            "none";

        content.style.display =
            "block";


    } catch (error) {

        console.error(
            "Load order error:",
            error
        );

        showError(
            "Unable to load order.<br><br>" +
            escapeHtml(error.message)
        );
    }
}


// ==============================
// LOAD MESSAGES
// ==============================

async function loadMessages() {

    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .from("order_messages")
                .select(
                    "id, order_id, sender_type, message, attachment_path, created_at"
                )
                .eq(
                    "order_id",
                    orderId
                )
                .order(
                    "created_at",
                    {
                        ascending: true
                    }
                );


        if (error) {
            throw error;
        }


        renderMessages(
            data || []
        );


    } catch (error) {

        console.error(
            "Load messages error:",
            error
        );

        showError(
            "Unable to load messages.<br><br>" +
            escapeHtml(error.message)
        );
    }
}


// ==============================
// RENDER MESSAGES
// ==============================

function renderMessages(messages) {

    messagesBox.innerHTML = "";


    if (!messages.length) {

        messagesBox.innerHTML =
            `
            <div class="empty">
                No messages yet.
            </div>
            `;

        return;
    }


    messages.forEach(
        item => {

            const div =
                document.createElement(
                    "div"
                );


            const isAdmin =
                String(
                    item.sender_type
                ).toLowerCase() ===
                "admin";


            div.className =
                isAdmin
                    ? "message admin"
                    : "message customer";


            const sender =
                isAdmin
                    ? "ADMIN"
                    : "CUSTOMER";


            const time =
                new Date(
                    item.created_at
                ).toLocaleString();


            div.innerHTML =
                `
                <div class="sender">
                    ${sender}
                </div>

                <div class="bubble">
                    ${escapeHtml(
                        item.message
                    )}
                </div>

                <div class="time">
                    ${escapeHtml(time)}
                </div>
                `;


            messagesBox.appendChild(
                div
            );
        }
    );


    messagesBox.scrollTop =
        messagesBox.scrollHeight;
}


// ==============================
// SEND MESSAGE
// ==============================

async function sendMessage() {

    const message =
        messageInput.value.trim();


    if (!message) {
        return;
    }


    sendButton.disabled =
        true;

    sendButton.textContent =
        "SENDING...";


    try {

        const {
            error
        } =
            await supabaseClient
                .from("order_messages")
                .insert({
                    order_id: orderId,
                    sender_type: "admin",
                    message: message,
                    attachment_path: null
                });


        if (error) {
            throw error;
        }


        messageInput.value =
            "";


        await loadMessages();


    } catch (error) {

        console.error(
            "Send message error:",
            error
        );

        alert(
            "Unable to send message:\n\n" +
            error.message
        );

    } finally {

        sendButton.disabled =
            false;

        sendButton.textContent =
            "SEND";
    }
}


// ==============================
// BACK
// ==============================

function goBack() {

    window.location.href =
        "dashboard.html";
}


// ==============================
// ERROR
// ==============================

function showError(message) {

    loading.style.display =
        "none";

    content.style.display =
        "none";

    errorBox.style.display =
        "block";

    errorBox.innerHTML =
        message;
}


// ==============================
// ESCAPE HTML
// ==============================

function escapeHtml(value) {

    const div =
        document.createElement(
            "div"
        );

    div.textContent =
        value == null
            ? ""
            : String(value);

    return div.innerHTML;
}


// ==============================
// EVENTS
// ==============================

sendButton.addEventListener(
    "click",
    sendMessage
);


messageInput.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Enter" &&
            !event.shiftKey
        ) {

            event.preventDefault();

            sendMessage();
        }
    }
);


// ==============================
// REALTIME NEW MESSAGE
// ==============================

function subscribeToMessages() {

    console.log(
        "Starting realtime for order:",
        orderId
    );

    supabaseClient
        .channel(
            "admin-order-chat-" + orderId
        )

        // TEXT MESSAGES
        .on(
            "postgres_changes",
            {
                event: "INSERT",
                schema: "public",
                table: "order_messages",
                filter:
                    "order_id=eq." + orderId
            },
            payload => {

                console.log(
                    "New message received:",
                    payload.new
                );

                loadMessages();
            }
        )

        // CUSTOMER SCREENSHOTS
        .on(
            "postgres_changes",
            {
                event: "INSERT",
                schema: "public",
                table: "order_screenshots",
                filter:
                    "order_id=eq." + orderId
            },
            async payload => {

                console.log(
                    "New customer screenshot:",
                    payload.new
                );

                await addImageToChat(
                    payload.new,
                    true
                );
            }
        )

        // SUBSCRIBE MUST BE LAST
        .subscribe(
            status => {

                console.log(
                    "Realtime status:",
                    status
                );
            }
        );
}

// ==============================
// START
// ==============================

async function start() {

    console.log(
        "Admin chat starting...",
        {
            orderId
        }
    );


    const isAdmin =
        await checkAdmin();


    if (!isAdmin) {
        return;
    }


    await loadOrder();


    // Start realtime AFTER
    // admin verification
    subscribeToMessages();
}

// ==============================
// ADMIN VIEWING PRESENCE
// ==============================

let adminPresenceChannel = null;

function startAdminPresence() {

    if (!orderId) {
        return;
    }

    adminPresenceChannel =
        supabaseClient.channel(
            `order-presence-${orderId}`,
            {
                config: {
                    presence: {
                        key: "admin"
                    }
                }
            }
        );

    adminPresenceChannel
        .subscribe(async status => {

            if (status === "SUBSCRIBED") {

                await adminPresenceChannel.track({
                    role: "admin",
                    viewing: true,
                    online_at:
                        new Date().toISOString()
                });

                console.log(
                    "Admin viewing order:",
                    orderId
                );
            }
        });
}


// ==============================
// STOP ADMIN PRESENCE
// ==============================

function stopAdminPresence() {

    if (!adminPresenceChannel) {
        return;
    }

    adminPresenceChannel.untrack();

    supabaseClient.removeChannel(
        adminPresenceChannel
    );

    adminPresenceChannel = null;
}


window.addEventListener(
    "beforeunload",
    stopAdminPresence
);


// ==============================
// LOAD IMAGES
// ==============================

async function loadImages() {

    const { data, error } =
        await supabaseClient
            .from("order_screenshots")
            .select(
                "id, order_id, file_path, original_name, created_at"
            )
            .eq("order_id", orderId)
            .order("created_at", {
                ascending: true
            });

    if (error) {
        console.error(
            "Load screenshots error:",
            error
        );
        return;
    }

    for (const image of data || []) {
        await addImageToChat(image, false);
    }

    scrollToBottom();
}

// ==============================
// SHOW IMAGE TO MESSAGE
// ==============================

async function addImageToChat(image, scroll = true) {

    if (
        document.querySelector(
            `[data-image-id="${image.id}"]`
        )
    ) {
        return;
    }

    const { data, error } =
        await supabaseClient.storage
            .from("order-screenshots")
            .createSignedUrl(
                image.file_path,
                3600
            );

    if (error) {
        console.error(
            "Signed URL error:",
            error
        );
        return;
    }

    const div =
        document.createElement("div");

    div.className =
        "message customer";

    div.dataset.imageId =
        image.id;

    const time =
        new Date(
            image.created_at
        ).toLocaleString();

    div.innerHTML = `
        <div class="sender">
            CUSTOMER
        </div>

        <div class="bubble image-bubble">

            <img
                src="${escapeHtml(data.signedUrl)}"
                class="chat-image"
                alt="${escapeHtml(
                    image.original_name || "Image"
                )}"
                loading="lazy"
                onclick="window.open(
                    this.src,
                    '_blank'
                )"
            >

        </div>

        <div class="time">
            ${escapeHtml(time)}
        </div>
    `;

    messagesBox.appendChild(div);

    if (scroll) {
        scrollToBottom();
    }
}









start().then(() => {
    startAdminPresence();
});
