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

let realtimeChannel = null;
let adminPresenceChannel = null;


// ======================================================
// CHECK ADMIN
// ======================================================

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


// ======================================================
// LOAD ORDER
// ======================================================

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

        await loadMessages();

        await loadImages();

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


// ======================================================
// LOAD MESSAGES
// ======================================================

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


// ======================================================
// RENDER TEXT MESSAGES
// ======================================================

function renderMessages(messages) {

    /*
        Keep existing image messages.
        Remove only text-message elements.
    */

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

    messages.forEach(item => {

        const div =
            document.createElement("div");

        const isAdmin =
            String(
                item.sender_type
            ).toLowerCase() ===
            "admin";

        div.className =
            isAdmin
                ? "message admin"
                : "message customer";

        div.dataset.messageId =
            item.id;

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

        messagesBox.appendChild(div);

    });

    scrollToBottom();
}


// ======================================================
// SEND ADMIN MESSAGE
// ======================================================

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

        messageInput.value = "";

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


// ======================================================
// LOAD CUSTOMER IMAGES
// ======================================================

async function loadImages() {

    const {
        data,
        error
    } =
        await supabaseClient
            .from("order_screenshots")
            .select(
                "id, order_id, file_path, original_name, created_at"
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

        console.error(
            "Load screenshots error:",
            error
        );

        return;
    }

    for (const image of data || []) {

        await addImageToChat(
            image,
            false
        );
    }

    scrollToBottom();
}


// ======================================================
// SHOW CUSTOMER IMAGE
// ======================================================

async function addImageToChat(
    image,
    scroll = true
) {

    if (
        document.querySelector(
            `[data-image-id="${image.id}"]`
        )
    ) {
        return;
    }


    /*
        IMPORTANT:
        Use PUBLIC URL instead of signed URL.
    */

    const {
        data
    } =
        supabaseClient.storage
            .from("order-screenshots")
            .getPublicUrl(
                image.file_path
            );


    if (
        !data ||
        !data.publicUrl
    ) {

        console.error(
            "Unable to create public image URL:",
            image
        );

        return;
    }


    console.log(
        "IMAGE URL:",
        data.publicUrl
    );


    const div =
        document.createElement(
            "div"
        );

    div.className =
        "message customer";

    div.dataset.imageId =
        image.id;


    const time =
        new Date(
            image.created_at
        ).toLocaleString();


    div.innerHTML =
        `
        <div class="sender">
            CUSTOMER
        </div>

        <div class="bubble image-bubble">

            <img
                src="${escapeHtml(
                    data.publicUrl
                )}"
                class="chat-image"
                alt="${escapeHtml(
                    image.original_name ||
                    "Customer Image"
                )}"
                loading="lazy"
                onclick="window.open(
                    this.src,
                    '_blank'
                )"
                onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"
            >

            <div
                style="
                    display:none;
                    padding:10px;
                    color:#fecaca;
                "
            >
                Unable to display image.
            </div>

        </div>

        <div class="time">
            ${escapeHtml(time)}
        </div>
        `;


    messagesBox.appendChild(
        div
    );


    if (scroll) {
        scrollToBottom();
    }
}


// ======================================================
// REALTIME
// ======================================================

function subscribeToMessages() {

    console.log(
        "Starting realtime for order:",
        orderId
    );


    realtimeChannel =
        supabaseClient
            .channel(
                "admin-order-chat-" +
                orderId
            );


    // -----------------------------------------------
    // NEW TEXT MESSAGE
    // -----------------------------------------------

    realtimeChannel.on(
        "postgres_changes",
        {
            event: "INSERT",
            schema: "public",
            table: "order_messages",
            filter:
                "order_id=eq." +
                orderId
        },
        payload => {

            console.log(
                "REALTIME MESSAGE:",
                payload.new
            );


            /*
                Reload messages so admin gets
                the newest customer message.
            */

            loadMessages();


            const sender =
                String(
                    payload.new.sender_type
                ).toLowerCase();


            /*
                Only notify when CUSTOMER sends.
            */

            if (
                sender ===
                "customer"
            ) {

                showNewMessageNotification(
                    "New Customer Message",
                    payload.new.message ||
                    "Customer sent a message."
                );
            }
        }
    );


    // -----------------------------------------------
    // NEW CUSTOMER IMAGE
    // -----------------------------------------------

    realtimeChannel.on(
        "postgres_changes",
        {
            event: "INSERT",
            schema: "public",
            table: "order_screenshots",
            filter:
                "order_id=eq." +
                orderId
        },
        async payload => {

            console.log(
                "REALTIME CUSTOMER IMAGE:",
                payload.new
            );


            await addImageToChat(
                payload.new,
                true
            );


            showNewMessageNotification(
                "New Customer Image",
                payload.new.original_name ||
                "Customer sent an image."
            );
        }
    );


    realtimeChannel.subscribe(
        status => {

            console.log(
                "Realtime status:",
                status
            );


            if (
                status ===
                "SUBSCRIBED"
            ) {

                console.log(
                    "✓ ADMIN CHAT REALTIME CONNECTED"
                );
            }

            if (
                status ===
                "CHANNEL_ERROR"
            ) {

                console.error(
                    "✗ REALTIME CHANNEL ERROR"
                );
            }

            if (
                status ===
                "TIMED_OUT"
            ) {

                console.error(
                    "✗ REALTIME TIMED OUT"
                );
            }
        }
    );
}


// ======================================================
// NOTIFICATION
// ======================================================

function showNewMessageNotification(
    title,
    body
) {

    console.log(
        "NOTIFICATION:",
        title,
        body
    );


    /*
        Change browser tab title.
    */

    const oldTitle =
        document.title;

    document.title =
        "🔔 " +
        title;


    setTimeout(
        () => {

            document.title =
                oldTitle;

        },
        5000
    );


    /*
        Browser notification.
    */

    if (
        "Notification" in window
    ) {

        if (
            Notification.permission ===
            "granted"
        ) {

            new Notification(
                title,
                {
                    body: body,
                    icon:
                        "/mir4-gold-orders/favicon.ico"
                }
            );

        }

        else if (
            Notification.permission ===
            "default"
        ) {

            Notification.requestPermission()
                .then(permission => {

                    if (
                        permission ===
                        "granted"
                    ) {

                        new Notification(
                            title,
                            {
                                body: body
                            }
                        );
                    }

                })
                .catch(() => {});
        }
    }


    /*
        Simple sound.
    */

    try {

        const AudioContext =
            window.AudioContext ||
            window.webkitAudioContext;

        if (AudioContext) {

            const audioContext =
                new AudioContext();

            const oscillator =
                audioContext.createOscillator();

            const gain =
                audioContext.createGain();

            oscillator.frequency.value =
                880;

            gain.gain.value =
                0.08;

            oscillator.connect(
                gain
            );

            gain.connect(
                audioContext.destination
            );

            oscillator.start();

            oscillator.stop(
                audioContext.currentTime +
                0.15
            );
        }

    } catch (e) {

        console.log(
            "Notification sound unavailable."
        );
    }
}


// ======================================================
// ADMIN PRESENCE
// ======================================================

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
        .subscribe(
            async channelStatus => {

                if (
                    channelStatus ===
                    "SUBSCRIBED"
                ) {

                    await adminPresenceChannel.track({
                        role: "admin",
                        viewing: true,
                        online_at:
                            new Date()
                                .toISOString()
                    });

                    console.log(
                        "Admin viewing order:",
                        orderId
                    );
                }
            }
        );
}


// ======================================================
// STOP PRESENCE
// ======================================================

function stopAdminPresence() {

    if (!adminPresenceChannel) {
        return;
    }

    adminPresenceChannel.untrack();

    supabaseClient.removeChannel(
        adminPresenceChannel
    );

    adminPresenceChannel =
        null;
}


window.addEventListener(
    "beforeunload",
    stopAdminPresence
);


// ======================================================
// SCROLL
// ======================================================

function scrollToBottom() {

    if (!messagesBox) {
        return;
    }

    messagesBox.scrollTop =
        messagesBox.scrollHeight;
}


// ======================================================
// BACK
// ======================================================

function goBack() {

    window.location.href =
        "dashboard.html";
}


// ======================================================
// ERROR
// ======================================================

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


// ======================================================
// ESCAPE HTML
// ======================================================

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


// ======================================================
// EVENTS
// ======================================================

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


// ======================================================
// START
// ======================================================

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


    /*
        Start realtime BEFORE loading the data.
        This reduces the chance of missing a new
        customer message while the page is loading.
    */

    subscribeToMessages();


    await loadOrder();


    startAdminPresence();
}


start();
