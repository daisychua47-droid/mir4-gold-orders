const SUPABASE_URL = "https://osiixogirgixgqxfvsgw.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_gYNQ38R5yTs6gmX_o2H_iA_bf6nR1GW";

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

const closedMessage = document.getElementById("closedMessage");

let currentOrder = null;


// ===============================
// SHOW ERROR
// ===============================

function showError(message) {

    loading.style.display = "none";
    orderContent.style.display = "none";

    errorBox.style.display = "block";

    errorBox.innerHTML = `
        <div class="error">
            ${message}
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


    const { data, error } = await supabaseClient.rpc(
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
// REALTIME CUSTOMER CHAT
// ===============================

function subscribeToMessages() {

    if (!orderId) {
        return;
    }

    console.log(
        "Starting realtime for order:",
        orderId
    );

    supabaseClient
        .channel(`customer-order-${orderId}`)
        .on(
            "postgres_changes",
            {
                event: "INSERT",
                schema: "public",
                table: "order_messages",
                filter: `order_id=eq.${orderId}`
            },
            payload => {

                console.log(
                    "REALTIME MESSAGE:",
                    payload.new
                );

                addRealtimeMessage(
                    payload.new
                );
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
    // ORDER INFORMATION
    // ===============================

    orderNumber.textContent =
        currentOrder.order_number;

    server.textContent =
        currentOrder.server;

    gold.textContent =
        Number(currentOrder.requested_gold).toLocaleString() + " G";

    status.textContent =
        currentOrder.status;


    // ===============================
    // MESSAGES
    // ===============================

    renderMessages(data.messages);

    // ===============================
// ADD SINGLE REALTIME MESSAGE
// ===============================

function addRealtimeMessage(message) {

    // Ignore invalid messages
    if (!message) return;

    // Prevent duplicate message
    const existingMessage =
        messagesBox.querySelector(
            `[data-message-id="${message.id}"]`
        );

    if (existingMessage) {
        return;
    }

    // Remove "No messages yet."
    const empty =
        messagesBox.querySelector(".empty");

    if (empty) {
        empty.remove();
    }

    const messageDiv =
        document.createElement("div");

    messageDiv.className =
        `message ${message.sender_type}`;

    messageDiv.dataset.messageId =
        message.id;

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

    messagesBox.appendChild(messageDiv);

    // Scroll to latest message
    messagesBox.scrollTop =
        messagesBox.scrollHeight;
}


    // ===============================
    // CLOSED ORDER
    // ===============================

    if (currentOrder.status === "CLOSED") {

        composer.style.display = "none";

        closedMessage.style.display = "block";

    } else {

        composer.style.display = "flex";

        closedMessage.style.display = "none";
    }


    loading.style.display = "none";
    errorBox.style.display = "none";
    orderContent.style.display = "block";
}


// ===============================
// RENDER MESSAGES
// ===============================

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


    messages.forEach(message => {

        const messageDiv =
            document.createElement("div");

        messageDiv.className =
            `message ${message.sender_type}`;
        
        messageDiv.dataset.messageId =
            message.id;


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


        messagesBox.appendChild(messageDiv);
    });


    // Scroll to latest message
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
        text;

    return div.innerHTML;
}


// ===============================
// SEND MESSAGE
// ===============================

async function sendMessage() {

    const message =
        messageInput.value.trim();


    if (!message) {
        return;
    }


    if (!currentOrder) {
        return;
    }


    sendButton.disabled = true;
    sendButton.textContent = "SENDING...";


    const { data, error } =
        await supabaseClient.rpc(
            "send_customer_message",
            {
                p_order_id: Number(orderId),
                p_access_token: accessToken,
                p_message: message
            }
        );


    if (error) {

        console.error(error);

        alert(
            "Unable to send message. Please try again."
        );

        sendButton.disabled = false;
        sendButton.textContent = "SEND";

        return;
    }


    messageInput.value = "";


    sendButton.disabled = false;
    sendButton.textContent = "SEND";

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

loadOrder().then(() => {
    subscribeToMessages();
});
