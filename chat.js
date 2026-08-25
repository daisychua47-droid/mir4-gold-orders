const SUPABASE_URL = "https://osiixogirgixgqxfvsgw.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_gYNQ38R5yTs6gmX_o2H_iA_bf6nR1GW";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);


// ===============================
// GET ORDER ID + ACCESS TOKEN
// ===============================

const params = new URLSearchParams(window.location.search);

const orderId = params.get("order");
const accessToken = params.get("token");


// ===============================
// ELEMENTS
// ===============================

const loading =
    document.getElementById("loading");

const errorBox =
    document.getElementById("error");

const orderContent =
    document.getElementById("orderContent");

const orderNumber =
    document.getElementById("orderNumber");

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


// ===============================
// SHOW ERROR
// ===============================

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


// ===============================
// LOAD ORDER
// ===============================

async function loadOrder() {

    if (!orderId || !accessToken) {

        showError(
            "Invalid order link."
        );

        return;
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

        console.error(error);

        showError(
            "Order not found or this order link is invalid."
        );

        return;
    }


    currentOrder = data.order;


    // ===============================
    // ORDER INFORMATION
    // ===============================

    orderNumber.textContent =
        currentOrder.order_number;

    server.textContent =
        currentOrder.server;

    gold.textContent =
        Number(
            currentOrder.requested_gold
        ).toLocaleString() + " G";

    status.textContent =
        currentOrder.status;


    // ===============================
    // MESSAGES
    // ===============================

    renderMessages(
        data.messages || []
    );


    // ===============================
    // CLOSED ORDER
    // ===============================

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


    // ===============================
    // START REALTIME
    // ===============================

    subscribeToRealtime();
}


// ===============================
// RENDER MESSAGES
// ===============================

function renderMessages(messages) {

    messagesBox.innerHTML = "";


    if (
        !messages ||
        messages.length === 0
    ) {

        messagesBox.innerHTML = `
            <div class="empty">
                No messages yet.
            </div>
        `;

        return;
    }


    messages.forEach(message => {

        addMessageToChat(message);

    });


    scrollToBottom();
}


// ===============================
// ADD MESSAGE
// ===============================

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


    const time =
        date.toLocaleString();


    messageDiv.innerHTML = `

        <div class="sender">
            ${sender}
        </div>

        <div class="bubble">
            ${escapeHtml(message.message)}
        </div>

        <div class="time">
            ${time}
        </div>

    `;


    messagesBox.appendChild(
        messageDiv
    );
}


// ===============================
// ADD IMAGE TO CHAT
// ===============================

function addImageToChat(image) {

    const messageDiv =
        document.createElement("div");


    const sender =
        image.sender_type === "admin"
            ? "admin"
            : "customer";


    const senderText =
        image.sender_type === "admin"
            ? "ADMIN"
            : "YOU";


    const date =
        new Date(image.created_at);


    const time =
        date.toLocaleString();


    const imageUrl =
        supabaseClient.storage
            .from("order-screenshots")
            .getPublicUrl(image.file_path)
            .data.publicUrl;


    messageDiv.className =
        `message ${sender}`;


    messageDiv.innerHTML = `

        <div class="sender">
            ${senderText}
        </div>

        <div class="bubble">

            <img
                src="${escapeHtml(imageUrl)}"
                class="chat-image"
                alt="${escapeHtml(
                    image.original_name || "Image"
                )}"
                loading="lazy"
                onclick="window.open(this.src, '_blank')"
            >

        </div>

        <div class="time">
            ${time}
        </div>

    `;


    messagesBox.appendChild(
        messageDiv
    );
}


// ===============================
// LOAD EXISTING IMAGES
// ===============================

async function loadImages() {

    if (!currentOrder) {
        return;
    }


    const { data, error } =
        await supabaseClient
            .from("order_screenshots")
            .select(
                "id, order_id, file_path, original_name, created_at"
            )
            .eq(
                "order_id",
                Number(orderId)
            )
            .order(
                "created_at",
                {
                    ascending: true
                }
            );


    if (error) {

        console.error(
            "Unable to load images:",
            error
        );

        return;
    }


    if (!data) {
        return;
    }


    data.forEach(image => {

        // Don't add duplicates
        if (
            document.querySelector(
                `[data-image-id="${image.id}"]`
            )
        ) {
            return;
        }


        addImageToChat(image);


        const last =
            messagesBox.lastElementChild;

        if (last) {

            last.dataset.imageId =
                image.id;

        }

    });


    scrollToBottom();
}


// ===============================
// REALTIME
// ===============================

function subscribeToRealtime() {

    if (!orderId) {
        return;
    }


    if (realtimeChannel) {

        supabaseClient.removeChannel(
            realtimeChannel
        );

        realtimeChannel = null;
    }


    realtimeChannel =
        supabaseClient
            .channel(
                `customer-order-${orderId}`
            )

            // =========================
            // NEW TEXT MESSAGE
            // =========================

            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "order_messages",
                    filter:
                        `order_id=eq.${Number(orderId)}`
                },
                payload => {

                    console.log(
                        "New message:",
                        payload.new
                    );


                    // Remove "No messages yet"
                    const empty =
                        messagesBox.querySelector(
                            ".empty"
                        );

                    if (empty) {
                        empty.remove();
                    }


                    addMessageToChat(
                        payload.new
                    );


                    scrollToBottom();
                }
            )

            // =========================
            // NEW IMAGE
            // =========================

            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "order_screenshots",
                    filter:
                        `order_id=eq.${Number(orderId)}`
                },
                payload => {

                    console.log(
                        "New image:",
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
                        payload.new
                    );


                    const last =
                        messagesBox.lastElementChild;

                    if (last) {

                        last.dataset.imageId =
                            payload.new.id;

                    }


                    scrollToBottom();
                }
            )

            .subscribe(status => {

                console.log(
                    "Realtime status:",
                    status
                );

            });
}


// ===============================
// SCROLL
// ===============================

function scrollToBottom() {

    messagesBox.scrollTop =
        messagesBox.scrollHeight;
}


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
// FORMAT FILE SIZE
// ===============================

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


// ===============================
// SELECT IMAGE
// ===============================

imageButton.addEventListener(
    "click",
    function() {

        imageInput.click();

    }
);


// ===============================
// IMAGE SELECTED
// ===============================

imageInput.addEventListener(
    "change",
    function() {

        const file =
            imageInput.files[0];


        if (!file) {
            return;
        }


        // Only images
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


        // 10 MB maximum
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


        selectedImage = file;


        // Preview
        const reader =
            new FileReader();


        reader.onload = function(event) {

            previewImage.src =
                event.target.result;

        };


        reader.readAsDataURL(file);


        previewName.textContent =
            file.name;

        previewSize.textContent =
            formatFileSize(
                file.size
            );


        imagePreview.style.display =
            "block";
    }
);


// ===============================
// REMOVE SELECTED IMAGE
// ===============================

removeImage.addEventListener(
    "click",
    function() {

        selectedImage = null;

        imageInput.value = "";

        previewImage.src = "";

        previewName.textContent = "";

        previewSize.textContent = "";

        imagePreview.style.display =
            "none";
    }
);


// ===============================
// UPLOAD IMAGE
// ===============================

async function uploadImage() {

    if (!selectedImage) {
        return false;
    }

    if (!currentOrder) {
        return false;
    }

    const file = selectedImage;

    uploadStatus.style.display = "block";
    uploadStatus.textContent = "Uploading image...";

    imageButton.disabled = true;
    sendButton.disabled = true;

    try {

        // =========================
        // CREATE UNIQUE FILE PATH
        // =========================

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

        const filePath =
            `chat/${Number(orderId)}/${Date.now()}-${crypto.randomUUID()}.${safeExtension}`;


        // =========================
        // UPLOAD TO STORAGE
        // =========================

        const { error: uploadError } =
            await supabaseClient.storage
                .from("order-screenshots")
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


        uploadStatus.textContent =
            "Saving image...";


        // =========================
        // SAVE DATABASE RECORD
        // =========================

        const { data, error } =
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

            // Delete uploaded file if DB save failed
            await supabaseClient.storage
                .from("order-screenshots")
                .remove([
                    filePath
                ]);

            throw error;
        }


        console.log(
            "Screenshot saved:",
            data
        );


        // =========================
        // IMMEDIATELY SHOW IN CHAT
        // =========================

        const screenshotId =
            data?.screenshot_id;

        if (screenshotId) {

            const imageData = {

                id: screenshotId,

                order_id:
                    Number(orderId),

                file_path:
                    filePath,

                original_name:
                    file.name,

                created_at:
                    new Date().toISOString(),

                // Customer is sending this image
                sender_type:
                    "customer"
            };


            // Remove empty message
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


            const last =
                messagesBox.lastElementChild;

            if (last) {

                last.dataset.imageId =
                    screenshotId;

            }


            scrollToBottom();
        }


        // =========================
        // RESET IMAGE
        // =========================

        selectedImage = null;

        imageInput.value = "";

        previewImage.src = "";

        previewName.textContent = "";

        previewSize.textContent = "";

        imagePreview.style.display =
            "none";


        uploadStatus.textContent =
            "Image sent.";


        setTimeout(
            function() {

                uploadStatus.style.display =
                    "none";

            },
            1500
        );


        return true;


    } catch (error) {

        console.error(
            "Image upload failed:",
            error
        );

        alert(
            "Unable to upload image. Please try again."
        );

        uploadStatus.style.display =
            "none";

        return false;


    } finally {

        imageButton.disabled =
            false;

        sendButton.disabled =
            false;
    }
}

// ===============================
// SEND MESSAGE
// ===============================

async function sendMessage() {

    const message =
        messageInput.value.trim();


    // =========================
    // IMAGE ONLY
    // =========================

    if (
        !message &&
        selectedImage
    ) {

        await uploadImage();

        return;
    }


    // =========================
    // NOTHING TO SEND
    // =========================

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

    imageButton.disabled = true;

    sendButton.textContent =
        "SENDING...";


    // =========================
    // SEND TEXT
    // =========================

    if (message) {

        const { data, error } =
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

            console.error(error);

            alert(
                "Unable to send message. Please try again."
            );

            sendButton.disabled =
                false;

            imageButton.disabled =
                false;

            sendButton.textContent =
                "SEND";

            return;
        }


        messageInput.value = "";

        console.log(
            "Message sent:",
            data
        );
    }


    // =========================
    // SEND IMAGE TOO
    // =========================

    if (selectedImage) {

        await uploadImage();
    }


    sendButton.disabled =
        false;

    imageButton.disabled =
        false;

    sendButton.textContent =
        "SEND";
}


// ===============================
// SEND BUTTON
// ===============================

sendButton.addEventListener(
    "click",
    sendMessage
);


// ===============================
// ENTER TO SEND
// ===============================

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


// ===============================
// START
// ===============================

async function start() {

    await loadOrder();

    await loadImages();
}


start();
