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
let adminPresenceChannel = null;

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


function addRealtimeMessage(message) {

    if (!message) return;

    const existingMessage =
        messagesBox.querySelector(
            `[data-message-id="${message.id}"]`
        );

    if (existingMessage) {
        return;
    }

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

    messagesBox.scrollTop =
        messagesBox.scrollHeight;
}

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
// ADMIN VIEWING INDICATOR
// ===============================

function subscribeToAdminPresence() {

    if (!orderId) {
        return;
    }

    adminPresenceChannel =
        supabaseClient.channel(
            `order-presence-${orderId}`,
            {
                config: {
                    presence: {
                        key: "customer"
                    }
                }
            }
        );

    adminPresenceChannel
        .on(
            "presence",
            {
                event: "sync"
            },
            () => {

                updateAdminViewing();
            }
        )
        .on(
            "presence",
            {
                event: "join"
            },
            () => {

                updateAdminViewing();
            }
        )
        .on(
            "presence",
            {
                event: "leave"
            },
            () => {

                updateAdminViewing();
            }
        )
        .subscribe(status => {

            if (status === "SUBSCRIBED") {

                updateAdminViewing();
            }
        });
}


// ===============================
// UPDATE INDICATOR
// ===============================

function updateAdminViewing() {

    if (!adminPresenceChannel) {
        return;
    }

    const state =
        adminPresenceChannel.presenceState();

    const adminIsViewing =
        Object.keys(state).some(
            key => key === "admin"
        );


    let indicator =
        document.getElementById(
            "adminViewing"
        );


    if (!indicator) {

        indicator =
            document.createElement(
                "div"
            );

        indicator.id =
            "adminViewing";

        indicator.style.cssText = `
            display: none;
            padding: 8px 12px;
            margin-bottom: 10px;
            border-radius: 8px;
            background: #173b2a;
            color: #7ee2a8;
            font-size: 13px;
            text-align: center;
        `;


        messagesBox.parentNode.insertBefore(
            indicator,
            messagesBox
        );
    }


    if (adminIsViewing) {

        indicator.style.display =
            "block";

        indicator.textContent =
            "🟢 Admin is viewing this chat";

    } else {

        indicator.style.display =
            "none";
    }
}

// ===============================
// START
// ===============================

loadOrder().then(() => {

    subscribeToMessages();

    subscribeToAdminPresence();
});
