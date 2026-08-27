const SUPABASE_URL = "https://osiixogirgixgqxfvsgw.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_gYNQ38R5yTs6gmX_o2H_iA_bf6nR1GW";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);


// =====================================================
// URL PARAMETERS
// =====================================================

const params = new URLSearchParams(window.location.search);

const orderId = params.get("order");
const accessToken = params.get("token");


// =====================================================
// ELEMENTS
// =====================================================

const loading = document.getElementById("loading");
const errorBox = document.getElementById("error");
const orderContent = document.getElementById("orderContent");

const orderNumber = document.getElementById("orderNumber");
const server = document.getElementById("server");
const gold = document.getElementById("gold");
const status = document.getElementById("status");

const messagesBox = document.getElementById("messages");

const composer = document.getElementById("composer");
const messageInput = document.getElementById("messageInput");
const sendButton = document.getElementById("sendButton");

const closedMessage =
    document.getElementById("closedMessage");


// IMAGE ELEMENTS

const imageButton =
    document.getElementById("imageButton");

const imageInput =
    document.getElementById("imageInput");

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

const uploadStatus =
    document.getElementById("uploadStatus");


let currentOrder = null;
let selectedImage = null;
let realtimeChannel = null;


// =====================================================
// ERROR
// =====================================================

function showError(message) {

    loading.style.display = "none";

    orderContent.style.display = "none";

    errorBox.style.display = "block";

    errorBox.innerHTML = `
        <div class="error">
            ${escapeHtml(message)}
        </div>
    `;
}


// =====================================================
// LOAD ORDER
// =====================================================

async function loadOrder() {

    if (!orderId || !accessToken) {

        showError("Invalid order link.");

        return false;
    }


    const { data, error } =
        await supabaseClient.rpc(
            "get_customer_order",
            {
                p_order_id: Number(orderId),
                p_access_token: accessToken
            }
        );


    if (error) {

        console.error(
            "get_customer_order error:",
            error
        );

        showError(
            "Order not found or this order link is invalid."
        );

        return false;
    }


    if (!data || !data.order) {

        showError("Order not found.");

        return false;
    }


    currentOrder = data.order;


    // =================================================
    // ORDER INFO
    // =================================================

    orderNumber.textContent =
        currentOrder.order_number || "ORDER";

    server.textContent =
        currentOrder.server || "";

    gold.textContent =
        Number(
            currentOrder.requested_gold || 0
        ).toLocaleString() + " G";

    status.textContent =
        currentOrder.status || "";



    // =================================================
    // TEXT MESSAGES
    // =================================================
    
    renderMessages(
        (data.messages || []).map(message => ({
            ...message,
            is_image: false
        }))
    );


    // =================================================
    // CLOSED
    // =================================================

    if (
        currentOrder.status === "CLOSED"
    ) {

        composer.style.display = "none";

        closedMessage.style.display = "block";

    } else {

        composer.style.display = "block";

        closedMessage.style.display = "none";
    }


    loading.style.display = "none";

    errorBox.style.display = "none";

    orderContent.style.display = "block";


    return true;
}


// =====================================================
// RENDER TEXT MESSAGES
// =====================================================

function renderMessages(messages) {

    messagesBox.innerHTML = "";

    if (!messages || messages.length === 0) {

        messagesBox.innerHTML = `
            <div class="empty">
                No messages yet.
            </div>
        `;

        return;
    }

    messages
        .sort((a, b) =>
            new Date(a.created_at) -
            new Date(b.created_at)
        )
        .forEach(item => {

            if (item.is_image) {
                addImageToChat(item);
            } else {
                addMessageToChat(item);
            }

        });
}

// =====================================================
// ADD TEXT MESSAGE
// =====================================================

function addMessageToChat(message) {

    const messageDiv =
        document.createElement("div");


    messageDiv.className =
        `message ${message.sender_type}`;


    const sender =
        message.sender_type === "admin"
            ? "ADMIN"
            : "YOU";


    const date =
        new Date(message.created_at);


    messageDiv.innerHTML = `

        <div class="sender">
            ${sender}
        </div>

        <div class="bubble">
            ${escapeHtml(message.message)}
        </div>

        <div class="time">
            ${date.toLocaleString()}
        </div>

    `;


    messagesBox.appendChild(
        messageDiv
    );
}


// =====================================================
// GET PUBLIC IMAGE URL
// =====================================================

function getImageUrl(filePath) {

    if (!filePath) {
        return "";
    }

    const {
        data
    } = supabaseClient
        .storage
        .from("order-screenshots")
        .getPublicUrl(filePath);

    console.log(
        "IMAGE PATH:",
        filePath
    );

    console.log(
        "IMAGE URL:",
        data.publicUrl
    );

    return data.publicUrl;
}

// =====================================================
// ADD IMAGE TO CHAT
// =====================================================

function addImageToChat(image) {

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

    const messageDiv =
        document.createElement("div");

    // =========================================
    // CORRECT SENDER POSITION
    // =========================================

    const senderType =
        String(image.sender_type || "customer")
            .toLowerCase();

    messageDiv.className =
        `message ${senderType}`;

    messageDiv.dataset.imageId =
        image.id;

    // =========================================
    // SENDER NAME
    // =========================================

    const sender =
        document.createElement("div");

    sender.className =
        "sender";

    sender.textContent =
        senderType === "admin"
            ? "ADMIN"
            : "YOU";

    // =========================================
    // BUBBLE
    // =========================================

    const bubble =
        document.createElement("div");

    bubble.className =
        "bubble image-bubble";

    // =========================================
    // IMAGE
    // =========================================

    const img =
        document.createElement("img");

    const imageUrl =
        getImageUrl(image.file_path);

    img.className =
        "chat-image";

    img.src =
        imageUrl;

    img.alt =
        image.original_name || "Screenshot";

    img.loading =
        "lazy";

    // Important sizing
    img.style.display = "block";
    img.style.maxWidth = "100%";
    img.style.width = "auto";
    img.style.height = "auto";
    img.style.maxHeight = "400px";
    img.style.borderRadius = "8px";
    img.style.cursor = "pointer";

    // Open full image
    img.addEventListener(
        "click",
        function () {

            window.open(
                imageUrl,
                "_blank"
            );

        }
    );

    // =========================================
    // IMAGE ERROR
    // =========================================

    img.addEventListener(
        "error",
        function () {

            console.error(
                "IMAGE FAILED TO LOAD:",
                imageUrl
            );

            bubble.innerHTML = "";

            const errorText =
                document.createElement("div");

            errorText.style.color =
                "#fca5a5";

            errorText.style.fontSize =
                "13px";

            errorText.textContent =
                "Unable to display image.";

            const link =
                document.createElement("a");

            link.href =
                imageUrl;

            link.target =
                "_blank";

            link.rel =
                "noopener noreferrer";

            link.textContent =
                "Open image";

            link.style.display =
                "block";

            link.style.marginTop =
                "8px";

            link.style.color =
                "#93c5fd";

            bubble.appendChild(
                errorText
            );

            bubble.appendChild(
                link
            );
        }
    );

    bubble.appendChild(img);

    // =========================================
    // TIME
    // =========================================

    const time =
        document.createElement("div");

    time.className =
        "time";

    time.textContent =
        new Date(
            image.created_at
        ).toLocaleString();

    // =========================================
    // BUILD
    // =========================================

    messageDiv.appendChild(sender);
    messageDiv.appendChild(bubble);
    messageDiv.appendChild(time);

    messagesBox.appendChild(messageDiv);
}


// =====================================================
// LOAD SAVED IMAGES
// =====================================================
async function loadImages() {

    if (!currentOrder) {
        return;
    }

    console.log(
        "Loading saved images for order:",
        orderId
    );

    const {
        data,
        error
    } = await supabaseClient.rpc(
        "get_customer_screenshots",
        {
            p_order_id: Number(orderId),
            p_access_token: accessToken
        }
    );

    if (error) {

        console.error(
            "Unable to load customer screenshots:",
            error
        );

        return;
    }

    console.log(
        "Customer screenshots:",
        data
    );

    const images =
        Array.isArray(data)
            ? data
            : [];


    // Get messages through the secure customer RPC
    const {
        data: orderData,
        error: orderError
    } = await supabaseClient.rpc(
        "get_customer_order",
        {
            p_order_id: Number(orderId),
            p_access_token: accessToken
        }
    );


    if (orderError) {

        console.error(
            "Unable to reload messages:",
            orderError
        );

        return;
    }


    const textItems =
        (orderData?.messages || [])
            .map(message => ({
                ...message,
                is_image: false
            }));


    const imageItems =
        images.map(image => ({
            ...image,
            is_image: true
        }));


    // Combine text + images
    const allItems = [
        ...textItems,
        ...imageItems
    ];


    // Sort everything by actual creation time
    allItems.sort(
        (a, b) =>
            new Date(a.created_at) -
            new Date(b.created_at)
    );


    messagesBox.innerHTML = "";


    if (!allItems.length) {

        messagesBox.innerHTML = `
            <div class="empty">
                No messages yet.
            </div>
        `;

        return;
    }


    allItems.forEach(item => {

        if (item.is_image) {

            addImageToChat(item);

        } else {

            addMessageToChat(item);

        }

    });


    scrollToBottom();
}


// =====================================================
// REALTIME
// =====================================================

// =====================================================
// CUSTOMER LIVE CHAT
// =====================================================

let liveChatTimer = null;
let lastChatSignature = "";


// =====================================================
// CREATE CHAT SIGNATURE
// =====================================================

function createChatSignature(messages, images) {

    const messagePart =
        (messages || [])
            .map(item =>
                `${item.id}|${item.created_at}|${item.sender_type}|${item.message || ""}`
            )
            .join("||");

    const imagePart =
        (images || [])
            .map(item =>
                `${item.id}|${item.created_at}|${item.sender_type}|${item.file_path}`
            )
            .join("||");

    return messagePart + "###" + imagePart;
}


// =====================================================
// LOAD LIVE CHAT
// =====================================================

async function refreshCustomerChat() {

    if (!orderId || !accessToken) {
        return;
    }

    try {

        const {
            data,
            error
        } = await supabaseClient.rpc(
            "get_customer_order",
            {
                p_order_id: Number(orderId),
                p_access_token: accessToken
            }
        );


        if (error) {

            console.error(
                "Live chat error:",
                error
            );

            return;
        }


        if (!data || !data.order) {
            return;
        }


        const messages =
            data.messages || [];


        // ---------------------------------------------
        // LOAD IMAGES
        // ---------------------------------------------

        const {
    data: images,
    error: imageError
} =
    await supabaseClient.rpc(
        "get_customer_screenshots",
        {
            p_order_id: Number(orderId),
            p_access_token: accessToken
        }
    );


if (imageError) {

    console.error(
        "Live image error:",
        imageError
    );

    return;
}


const allImages =
    Array.isArray(images)
        ? images
        : [];


        if (imageError) {

            console.error(
                "Live image error:",
                imageError
            );

            return;
        }

        // ---------------------------------------------
        // CHECK IF CHAT CHANGED
        // ---------------------------------------------

        const signature =
            createChatSignature(
                messages,
                allImages
            );


        if (
            signature ===
            lastChatSignature
        ) {

            return;
        }


        lastChatSignature =
            signature;


        // ---------------------------------------------
        // COMBINE MESSAGES + IMAGES
        // ---------------------------------------------

        const items = [

            ...messages.map(message => ({
                ...message,
                is_image: false
            })),

            ...allImages.map(image => ({
                ...image,
                is_image: true
            }))

        ];


        items.sort(
            (a, b) =>
                new Date(a.created_at) -
                new Date(b.created_at)
        );


        // ---------------------------------------------
        // RENDER
        // ---------------------------------------------

        messagesBox.innerHTML = "";


        if (!items.length) {

            messagesBox.innerHTML = `
                <div class="empty">
                    No messages yet.
                </div>
            `;

            return;
        }


        items.forEach(item => {

            if (item.is_image) {

                addImageToChat(item);

            } else {

                addMessageToChat(item);

            }

        });


        scrollToBottom();


        console.log(
            "✓ Customer chat updated"
        );


    } catch (error) {

        console.error(
            "Live chat refresh error:",
            error
        );
    }
}


// =====================================================
// START LIVE CHAT
// =====================================================

function subscribeToRealtime() {

    // Stop previous timer

    if (liveChatTimer) {

        clearInterval(
            liveChatTimer
        );

        liveChatTimer = null;
    }


    console.log(
        "Starting customer live chat..."
    );


    // Check immediately

    refreshCustomerChat();


    // Check every 2 seconds

    liveChatTimer =
        setInterval(
            refreshCustomerChat,
            2000
        );


    console.log(
        "✓ Customer live chat started"
    );
}


// =====================================================
// STOP LIVE CHAT
// =====================================================

function stopLiveChat() {

    if (liveChatTimer) {

        clearInterval(
            liveChatTimer
        );

        liveChatTimer = null;
    }

}


// =====================================================
// STOP WHEN PAGE CLOSES
// =====================================================

window.addEventListener(
    "beforeunload",
    stopLiveChat
);

// =====================================================
// SCROLL
// =====================================================

function scrollToBottom() {

    messagesBox.scrollTop =
        messagesBox.scrollHeight;
}


// =====================================================
// ESCAPE HTML
// =====================================================

function escapeHtml(text) {

    const div =
        document.createElement("div");

    div.textContent =
        text ?? "";

    return div.innerHTML;
}


// =====================================================
// FILE SIZE
// =====================================================

function formatFileSize(bytes) {

    if (bytes < 1024) {

        return bytes + " B";
    }


    if (bytes < 1024 * 1024) {

        return (
            (bytes / 1024).toFixed(1) +
            " KB"
        );
    }


    return (
        (bytes / (1024 * 1024)).toFixed(1) +
        " MB"
    );
}


// =====================================================
// SELECT IMAGE
// =====================================================

if (imageButton && imageInput) {

    imageButton.addEventListener(
        "click",
        function() {

            imageInput.click();

        }
    );


    imageInput.addEventListener(
        "change",
        function() {

            const file =
                imageInput.files[0];


            if (!file) {
                return;
            }


            if (
                !file.type.startsWith(
                    "image/"
                )
            ) {

                alert(
                    "Please select an image."
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


            const reader =
                new FileReader();


            reader.onload =
                function(event) {

                    if (previewImage) {

                        previewImage.src =
                            event.target.result;
                    }

                };


            reader.readAsDataURL(
                file
            );


            if (previewName) {

                previewName.textContent =
                    file.name;
            }


            if (previewSize) {

                previewSize.textContent =
                    formatFileSize(
                        file.size
                    );
            }


            if (imagePreview) {

                imagePreview.style.display =
                    "block";
            }

        }
    );
}


// =====================================================
// REMOVE IMAGE
// =====================================================

if (removeImage) {

    removeImage.addEventListener(
        "click",
        function() {

            selectedImage = null;


            if (imageInput) {
                imageInput.value = "";
            }


            if (previewImage) {
                previewImage.src = "";
            }


            if (previewName) {
                previewName.textContent = "";
            }


            if (previewSize) {
                previewSize.textContent = "";
            }


            if (imagePreview) {

                imagePreview.style.display =
                    "none";
            }

        }
    );
}


// =====================================================
// UPLOAD IMAGE
// =====================================================

async function uploadImage() {

    if (!selectedImage) {
        return false;
    }


    if (!currentOrder) {
        return false;
    }


    const file =
        selectedImage;


    if (uploadStatus) {

        uploadStatus.style.display =
            "block";

        uploadStatus.textContent =
            "Uploading image...";
    }


    if (imageButton) {
        imageButton.disabled = true;
    }


    if (sendButton) {
        sendButton.disabled = true;
    }


    try {

        // ---------------------------------------------
        // FILE EXTENSION
        // ---------------------------------------------

        const extension =
            file.name
                .split(".")
                .pop()
                .toLowerCase();


        const safeExtension =
            extension.replace(
                /[^a-z0-9]/gi,
                ""
            );


        // ---------------------------------------------
        // UNIQUE PATH
        // ---------------------------------------------

        const filePath =
            `chat/${Number(orderId)}/${Date.now()}-${crypto.randomUUID()}.${safeExtension}`;


        console.log(
            "Uploading:",
            filePath
        );


        // ---------------------------------------------
        // STORAGE
        // ---------------------------------------------

        const {
            error: uploadError
        } =
            await supabaseClient.storage
                .from(
                    "order-screenshots"
                )
                .upload(
                    filePath,
                    file,
                    {
                        cacheControl: "3600",
                        contentType: file.type,
                        upsert: false
                    }
                );


        if (uploadError) {

            console.error(
                "Storage upload error:",
                uploadError
            );

            throw uploadError;
        }


        // ---------------------------------------------
        // SAVE DB
        // ---------------------------------------------

        if (uploadStatus) {

            uploadStatus.textContent =
                "Saving image...";
        }


        const {
            data,
            error
        } =
            await supabaseClient.rpc(
                "add_customer_screenshot",
                {
                    p_order_id:
                        Number(orderId),

                    p_access_token:
                        accessToken,

                    p_file_path:
                        filePath,

                    p_original_name:
                        file.name
                }
            );


        if (error) {

            console.error(
                "Database screenshot error:",
                error
            );


            await supabaseClient.storage
                .from(
                    "order-screenshots"
                )
                .remove([
                    filePath
                ]);


            throw error;
        }


        console.log(
            "Screenshot saved:",
            data
        );


        // ---------------------------------------------
        // GET ID
        // ---------------------------------------------

        let screenshotId =
            data?.screenshot_id;


        /*
         * If RPC does not return screenshot_id,
         * find the record we just inserted.
         */

        if (!screenshotId) {

            const {
                data: screenshot
            } =
                await supabaseClient
                    .from(
                        "order_screenshots"
                    )
                    .select(
                        "id, order_id, file_path, original_name, created_at"
                    )
                    .eq(
                        "order_id",
                        Number(orderId)
                    )
                    .eq(
                        "file_path",
                        filePath
                    )
                    .maybeSingle();


            if (screenshot) {

                screenshotId =
                    screenshot.id;

            }
        }


        // ---------------------------------------------
        // SHOW IMMEDIATELY
        // ---------------------------------------------

        if (screenshotId) {

            const imageData = {

                id:
                    screenshotId,

                order_id:
                    Number(orderId),

                file_path:
                    filePath,

                original_name:
                    file.name,

                created_at:
                    new Date().toISOString()
            };


            const empty =
                messagesBox.querySelector(
                    ".empty"
                );

            if (empty) {
                empty.remove();
            }


            addImageToChat(
                imageData
            );


            scrollToBottom();

        } else {

            /*
             * RPC didn't return an ID.
             * Reload saved images instead.
             */

            await loadImages();
        }


        // ---------------------------------------------
        // RESET
        // ---------------------------------------------

        selectedImage = null;


        if (imageInput) {
            imageInput.value = "";
        }


        if (previewImage) {
            previewImage.src = "";
        }


        if (previewName) {
            previewName.textContent = "";
        }


        if (previewSize) {
            previewSize.textContent = "";
        }


        if (imagePreview) {

            imagePreview.style.display =
                "none";
        }


        if (uploadStatus) {

            uploadStatus.textContent =
                "Image sent.";

            setTimeout(
                function() {

                    uploadStatus.style.display =
                        "none";

                },
                1500
            );
        }


        return true;


    } catch (error) {

        console.error(
            "Image upload failed:",
            error
        );


        alert(
            "Unable to upload image. Please try again."
        );


        if (uploadStatus) {

            uploadStatus.style.display =
                "none";
        }


        return false;


    } finally {

        if (imageButton) {
            imageButton.disabled = false;
        }

        if (sendButton) {
            sendButton.disabled = false;
        }
    }
}


// =====================================================
// SEND MESSAGE
// =====================================================

async function sendMessage() {

    const message =
        messageInput.value.trim();


    // IMAGE ONLY

    if (
        !message &&
        selectedImage
    ) {

        await uploadImage();

        return;
    }


    // NOTHING

    if (
        !message &&
        !selectedImage
    ) {

        return;
    }


    if (!currentOrder) {
        return;
    }


    sendButton.disabled = true;


    if (imageButton) {
        imageButton.disabled = true;
    }


    sendButton.textContent =
        "SENDING...";


    try {

        // ---------------------------------------------
        // TEXT
        // ---------------------------------------------

        if (message) {

            const {
                data,
                error
            } =
                await supabaseClient.rpc(
                    "send_customer_message",
                    {
                        p_order_id:
                            Number(orderId),

                        p_access_token:
                            accessToken,

                        p_message:
                            message
                    }
                );


            if (error) {

                console.error(
                    error
                );

                alert(
                    "Unable to send message. Please try again."
                );

                return;
            }


            messageInput.value = "";


            console.log(
                "Message sent:",
                data
            );
        }


        // ---------------------------------------------
        // IMAGE + TEXT
        // ---------------------------------------------

        if (selectedImage) {

            await uploadImage();
        }


    } finally {

        sendButton.disabled =
            false;


        if (imageButton) {
            imageButton.disabled = false;
        }


        sendButton.textContent =
            "SEND";
    }
}


// =====================================================
// SEND BUTTON
// =====================================================

sendButton.addEventListener(
    "click",
    sendMessage
);


// =====================================================
// ENTER
// =====================================================

messageInput.addEventListener(
    "keydown",
    function(event) {

        if (
            event.key === "Enter" &&
            !event.shiftKey
        ) {

            event.preventDefault();

            sendMessage();
        }

    }
);


// =====================================================
// START
// =====================================================

async function start() {

    const loaded =
        await loadOrder();


    if (!loaded) {
        return;
    }


    await loadImages();


    // Start automatic customer chat updates

    subscribeToRealtime();


    scrollToBottom();
}


start();
