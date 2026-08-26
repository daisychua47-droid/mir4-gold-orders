const SUPABASE_URL =
    "https://osiixogirgixgqxfvsgw.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_gYNQ38R5yTs6gmX_o2H_iA_bf6nR1GW";

const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY
    );


// ======================================================
// URL
// ======================================================

const params =
    new URLSearchParams(
        window.location.search
    );

const orderId =
    Number(params.get("order"));


// ======================================================
// ELEMENTS
// ======================================================

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


const imageInput =
    document.getElementById("imageInput");

const attachButton =
    document.getElementById("attachButton");

const imagePreview =
    document.getElementById("imagePreview");

const previewImage =
    document.getElementById("previewImage");

const previewName =
    document.getElementById("previewName");

const previewSize =
    document.getElementById("previewSize");

const removeImage =
    document.getElementById("removeImage");

let selectedImage = null;


// ======================================================
// NOTIFICATION STATE
// ======================================================

let notificationReady = false;

let originalTitle =
    document.title;


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
            escapeHtml(
                error.message
            )
        );


        return false;
    }
}


// ======================================================
// ENABLE NOTIFICATIONS
// ======================================================

async function enableNotifications() {

    if (
        !("Notification" in window)
    ) {

        console.log(
            "Browser notifications are not supported."
        );

        return;
    }


    if (
        Notification.permission ===
        "granted"
    ) {

        notificationReady = true;

        console.log(
            "✓ Browser notifications already enabled."
        );

        return;
    }


    if (
        Notification.permission ===
        "denied"
    ) {

        console.warn(
            "Browser notifications are blocked."
        );

        return;
    }


    try {

        const permission =
            await Notification.requestPermission();


        if (
            permission ===
            "granted"
        ) {

            notificationReady =
                true;

            console.log(
                "✓ Browser notifications enabled."
            );

        } else {

            console.warn(
                "Notification permission:",
                permission
            );
        }


    } catch (error) {

        console.error(
            "Notification permission error:",
            error
        );
    }
}


// ======================================================
// USER INTERACTION = ENABLE NOTIFICATION
// ======================================================

document.addEventListener(
    "click",
    function() {

        if (!notificationReady) {

            enableNotifications();

        }

    },
    {
        once: true
    }
);


// ======================================================
// LOAD ORDER
// ======================================================

async function loadOrder() {

    if (!orderId) {

        showError(
            "Invalid order ID."
        );

        return false;
    }


    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .from("orders")
                .select("*")
                .eq(
                    "id",
                    orderId
                )
                .maybeSingle();


        if (error) {
            throw error;
        }


        if (!data) {

            showError(
                "Order not found."
            );

            return false;
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


        // Load complete conversation

        await loadChat();


        return true;


    } catch (error) {

        console.error(
            "Load order error:",
            error
        );


        showError(
            "Unable to load order.<br><br>" +
            escapeHtml(
                error.message
            )
        );


        return false;
    }
}


// ======================================================
// LOAD COMPLETE CHAT
// ======================================================

async function loadChat() {

    try {

        const [
            messagesResult,
            imagesResult
        ] =
            await Promise.all([

                supabaseClient
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
                    ),

                supabaseClient
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
                    )
            ]);


        if (messagesResult.error) {
            throw messagesResult.error;
        }


        if (imagesResult.error) {
            throw imagesResult.error;
        }


        const messages =
            messagesResult.data || [];


        const images =
            imagesResult.data || [];


        // Combine messages + images

        const chatItems = [];


        messages.forEach(
            message => {

                chatItems.push({

                    type: "message",

                    id:
                        message.id,

                    created_at:
                        message.created_at,

                    data:
                        message
                });

            }
        );


        images.forEach(
            image => {

                chatItems.push({

                    type: "image",

                    id:
                        image.id,

                    created_at:
                        image.created_at,

                    data:
                        image
                });

            }
        );


        // Sort by time

        chatItems.sort(
            (a, b) =>
                new Date(
                    a.created_at
                ) -
                new Date(
                    b.created_at
                )
        );


        renderChat(
            chatItems
        );


    } catch (error) {

        console.error(
            "Load chat error:",
            error
        );


        showError(
            "Unable to load chat.<br><br>" +
            escapeHtml(
                error.message
            )
        );
    }
}


// ======================================================
// RENDER COMPLETE CHAT
// ======================================================

function renderChat(items) {

    messagesBox.innerHTML = "";


    if (!items.length) {

        messagesBox.innerHTML =
            `
            <div class="empty">
                No messages yet.
            </div>
            `;

        return;
    }


    items.forEach(
        item => {

            if (
                item.type ===
                "message"
            ) {

                addTextMessage(
                    item.data
                );

            } else {

                addImageToChat(
                    item.data,
                    false
                );
            }

        }
    );


    scrollToBottom();
}


// ======================================================
// ADD TEXT MESSAGE
// ======================================================

function addTextMessage(
    item
) {

    if (
        document.querySelector(
            `[data-message-id="${item.id}"]`
        )
    ) {

        return;
    }


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
            ${escapeHtml(
                time
            )}
        </div>
        `;


    messagesBox.appendChild(
        div
    );
}


// ======================================================
// IMAGE URL
// ======================================================

function getImageUrl(
    filePath
) {

    if (!filePath) {
        return "";
    }


    const cleanPath =
        String(filePath)
            .split("/")
            .map(
                part =>
                    encodeURIComponent(
                        part
                    )
            )
            .join("/");


    return (
        SUPABASE_URL +
        "/storage/v1/object/public/order-screenshots/" +
        cleanPath
    );
}


// ======================================================
// ADD IMAGE
// ======================================================

function addImageToChat(
    image,
    scroll = true
) {

    if (!image || !image.id) {
        return;
    }


    // Prevent duplicate

    if (
        document.querySelector(
            `[data-image-id="${image.id}"]`
        )
    ) {

        return;
    }


    const imageUrl =
        getImageUrl(
            image.file_path
        );


    if (!imageUrl) {

        console.error(
            "Invalid image path:",
            image
        );

        return;
    }


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
                    imageUrl
                )}"
                class="chat-image"
                alt="${escapeHtml(
                    image.original_name ||
                    "Customer Image"
                )}"
                loading="lazy"
            >

            <div
                class="image-error"
                style="
                    display:none;
                    color:#fecaca;
                    padding:10px;
                "
            >
                Unable to display image.
                <br>
                <a
                    href="${escapeHtml(
                        imageUrl
                    )}"
                    target="_blank"
                    rel="noopener"
                    style="
                        color:#93c5fd;
                        display:inline-block;
                        margin-top:6px;
                    "
                >
                    Open image
                </a>
            </div>

        </div>

        <div class="time">
            ${escapeHtml(
                time
            )}
        </div>
        `;


    const img =
        div.querySelector(
            ".chat-image"
        );


    const errorMessage =
        div.querySelector(
            ".image-error"
        );


    img.addEventListener(
        "click",
        function() {

            window.open(
                imageUrl,
                "_blank"
            );

        }
    );


    img.addEventListener(
        "error",
        function() {

            console.error(
                "IMAGE FAILED:",
                imageUrl
            );


            img.style.display =
                "none";


            errorMessage.style.display =
                "block";

        }
    );


    messagesBox.appendChild(
        div
    );


    if (scroll) {

        scrollToBottom();
    }
}


// ======================================================
// SEND ADMIN MESSAGE
// ======================================================

async function sendMessage() {

    const message =
        messageInput.value.trim();


    if (
        !message &&
        !selectedImage
    ) {

        return;
    }


    sendButton.disabled =
        true;

    attachButton.disabled =
        true;

    sendButton.textContent =
        "SENDING...";


    try {

        // ------------------------------------------
        // SEND TEXT
        // ------------------------------------------

        if (message) {

            const {
                error
            } =
                await supabaseClient
                    .from("order_messages")
                    .insert({

                        order_id:
                            orderId,

                        sender_type:
                            "admin",

                        message:
                            message,

                        attachment_path:
                            null
                    });


            if (error) {
                throw error;
            }
        }


        // ------------------------------------------
        // SEND IMAGE
        // ------------------------------------------

        if (selectedImage) {

            await uploadAdminImage();
        }


        // ------------------------------------------
        // CLEAR
        // ------------------------------------------

        messageInput.value =
            "";


        selectedImage =
            null;


        imageInput.value =
            "";


        previewImage.src =
            "";


        imagePreview.style.display =
            "none";


    } catch (error) {

        console.error(
            "Send error:",
            error
        );


        alert(
            "Unable to send:\n\n" +
            error.message
        );


    } finally {

        sendButton.disabled =
            false;

        attachButton.disabled =
            false;

        sendButton.textContent =
            "SEND";
    }
}
// ======================================================
// REALTIME
// ======================================================

function subscribeToMessages() {

    if (
        realtimeChannel
    ) {

        supabaseClient.removeChannel(
            realtimeChannel
        );

        realtimeChannel =
            null;
    }


    console.log(
        "Starting realtime:",
        orderId
    );


    realtimeChannel =
        supabaseClient
            .channel(
                "admin-order-chat-" +
                orderId +
                "-" +
                Date.now()
            );


    // ==================================================
    // NEW TEXT
    // ==================================================

    realtimeChannel.on(
        "postgres_changes",
        {
            event: "INSERT",
            schema: "public",
            table: "order_messages",
            filter:
                `order_id=eq.${orderId}`
        },
        payload => {

            console.log(
                "REALTIME MESSAGE:",
                payload.new
            );


            // IMPORTANT:
            // DO NOT call loadMessages()
            // because that used to delete images.

            const empty =
                messagesBox.querySelector(
                    ".empty"
                );


            if (empty) {
                empty.remove();
            }


            addTextMessage(
                payload.new
            );


            scrollToBottom();


            // Only notify customer messages

            if (
                String(
                    payload.new.sender_type
                ).toLowerCase() ===
                "customer"
            ) {

                notifyAdmin(
                    "New Customer Message",
                    payload.new.message ||
                    "Customer sent a message."
                );
            }
        }
    );


    // ==================================================
    // NEW IMAGE
    // ==================================================

    realtimeChannel.on(
        "postgres_changes",
        {
            event: "INSERT",
            schema: "public",
            table: "order_screenshots",
            filter:
                `order_id=eq.${orderId}`
        },
        payload => {

            console.log(
                "REALTIME IMAGE:",
                payload.new
            );


            const empty =
                messagesBox.querySelector(
                    ".empty"
                );


            if (empty) {
                empty.remove();
            }


            addImageToChat(
                payload.new,
                true
            );


            notifyAdmin(
                "New Customer Image",
                payload.new.original_name ||
                "Customer sent an image."
            );
        }
    );


    realtimeChannel.subscribe(
        realtimeStatus => {

            console.log(
                "Realtime status:",
                realtimeStatus
            );


            if (
                realtimeStatus ===
                "SUBSCRIBED"
            ) {

                console.log(
                    "✓ ADMIN CHAT REALTIME CONNECTED"
                );
            }


            if (
                realtimeStatus ===
                "CHANNEL_ERROR"
            ) {

                console.error(
                    "✗ ADMIN CHAT REALTIME ERROR"
                );
            }


            if (
                realtimeStatus ===
                "TIMED_OUT"
            ) {

                console.error(
                    "✗ ADMIN CHAT REALTIME TIMEOUT"
                );
            }
        }
    );
}


// ======================================================
// ADMIN NOTIFICATION
// ======================================================

function notifyAdmin(
    title,
    body
) {

    console.log(
        "ADMIN NOTIFICATION:",
        title,
        body
    );


    // ----------------------------------------------
    // TAB TITLE
    // ----------------------------------------------

    document.title =
        "🔔 " +
        title;


    setTimeout(
        function() {

            document.title =
                originalTitle;

        },
        6000
    );


    // ----------------------------------------------
    // BROWSER NOTIFICATION
    // ----------------------------------------------

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
                        "mir4-order-" +
                        orderId
                }
            );

        } catch (error) {

            console.error(
                "Notification error:",
                error
            );
        }
    }


    // ----------------------------------------------
    // SOUND
    // ----------------------------------------------

    playNotificationSound();
}


// ======================================================
// NOTIFICATION SOUND
// ======================================================

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


// ======================================================
// ADMIN PRESENCE
// ======================================================

function startAdminPresence() {

    if (!orderId) {
        return;
    }


    if (
        adminPresenceChannel
    ) {

        supabaseClient.removeChannel(
            adminPresenceChannel
        );
    }


    adminPresenceChannel =
        supabaseClient.channel(
            `order-presence-${orderId}`,
            {
                config: {

                    presence: {

                        key:
                            "admin"
                    }
                }
            }
        );


    adminPresenceChannel.subscribe(
        async channelStatus => {

            if (
                channelStatus ===
                "SUBSCRIBED"
            ) {

                await adminPresenceChannel.track({

                    role:
                        "admin",

                    viewing:
                        true,

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

    if (
        adminPresenceChannel
    ) {

        try {

            adminPresenceChannel.untrack();

        } catch (e) {}


        supabaseClient.removeChannel(
            adminPresenceChannel
        );


        adminPresenceChannel =
            null;
    }
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

function showError(
    message
) {

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
// ESCAPE
// ======================================================

function escapeHtml(
    value
) {

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
// ADD IMAGE SELECTION
// ======================================================

attachButton.addEventListener(
    "click",
    function () {

        imageInput.click();

    }
);


imageInput.addEventListener(
    "change",
    function () {

        const file =
            imageInput.files[0];


        if (!file) {
            return;
        }


        if (
            ![
                "image/jpeg",
                "image/png",
                "image/webp"
            ].includes(file.type)
        ) {

            alert(
                "Please select a JPG, PNG, or WEBP image."
            );

            imageInput.value = "";

            return;
        }


        if (
            file.size >
            10 * 1024 * 1024
        ) {

            alert(
                "Image must be 10 MB or smaller."
            );

            imageInput.value = "";

            return;
        }


        selectedImage =
            file;


        previewImage.src =
            URL.createObjectURL(
                file
            );


        previewName.textContent =
            file.name;


        previewSize.textContent =
            formatFileSize(
                file.size
            );


        imagePreview.style.display =
            "flex";
    }
);

// ======================================================
// Remove selected image
// ======================================================
removeImage.addEventListener(
    "click",
    function () {

        selectedImage =
            null;

        imageInput.value =
            "";

        previewImage.src =
            "";

        imagePreview.style.display =
            "none";
    }
);

// ======================================================
// file size function
// ======================================================
function formatFileSize(
    bytes
) {

    if (
        bytes < 1024
    ) {

        return bytes +
            " B";
    }


    if (
        bytes < 1024 * 1024
    ) {

        return (
            bytes / 1024
        ).toFixed(1) +
        " KB";
    }


    return (
        bytes /
        (1024 * 1024)
    ).toFixed(1) +
    " MB";
}

// ======================================================
// UPLOAD FUNCTION
// ======================================================

async function uploadAdminImage() {

    if (!selectedImage) {
        return null;
    }


    const extension =
        selectedImage.name
            .split(".")
            .pop()
            .toLowerCase();


    const randomName =
        crypto.randomUUID() +
        "." +
        extension;


    const filePath =
        `chat/${orderId}/${randomName}`;


    console.log(
        "Uploading admin image:",
        filePath
    );


    const {
        error
    } =
        await supabaseClient
            .storage
            .from("order-screenshots")
            .upload(
                filePath,
                selectedImage,
                {
                    cacheControl:
                        "3600",

                    contentType:
                        selectedImage.type,

                    upsert:
                        false
                }
            );


    if (error) {
        throw error;
    }


    // Save database record

    const {
        data,
        error:
            databaseError
    } =
        await supabaseClient
            .from("order_screenshots")
            .insert({

                order_id:
                    orderId,

                file_path:
                    filePath,

                original_name:
                    selectedImage.name

            })
            .select()
            .single();


    if (databaseError) {
        throw databaseError;
    }


    console.log(
        "Admin image saved:",
        data
    );


    return data;
}
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


    // Enable notification permission
    // while page is being interacted with

    enableNotifications();


    const isAdmin =
        await checkAdmin();


    if (!isAdmin) {
        return;
    }


    // Start realtime first

    subscribeToMessages();


    // Load order + complete chat

    const loaded =
        await loadOrder();


    if (!loaded) {
        return;
    }


    // Presence

    startAdminPresence();


    console.log(
        "✓ Admin chat ready"
    );
}


start();
