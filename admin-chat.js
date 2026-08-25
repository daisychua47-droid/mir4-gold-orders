<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">

    <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
    >

    <title>MIR4 GOLD - Admin Chat</title>

    <style>

        * {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            min-height: 100vh;
            font-family: Arial, sans-serif;
            background: #101827;
            color: white;
        }

        header {
            height: 70px;
            background: #1f2d42;
            border-bottom: 1px solid #394961;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 25px;
        }

        header h2 {
            margin: 0;
            font-size: 20px;
        }

        .back {
            background: #40516a;
            color: white;
            border: none;
            border-radius: 6px;
            padding: 10px 18px;
            cursor: pointer;
        }

        .container {
            max-width: 950px;
            margin: 25px auto;
            padding: 0 15px;
        }

        .order-card {
            background: #202f43;
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 20px;
        }

        .order-number {
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 18px;
        }

        .info {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
        }

        .label {
            color: #9fb0c7;
            font-size: 12px;
            margin-bottom: 5px;
        }

        .value {
            font-size: 15px;
            font-weight: bold;
        }

        .chat-card {
            background: #182437;
            border-radius: 10px;
            overflow: hidden;
        }

        .chat-title {
            background: #202f43;
            padding: 15px 20px;
            font-weight: bold;
            border-bottom: 1px solid #34445a;
        }

        #messages {
            height: 500px;
            overflow-y: auto;
            padding: 20px;
        }

        .message {
            margin-bottom: 18px;
            max-width: 75%;
        }

        .message.customer {
            margin-right: auto;
        }

        .message.admin {
            margin-left: auto;
            text-align: right;
        }

        .sender {
            font-size: 11px;
            color: #9fb0c7;
            margin-bottom: 5px;
            font-weight: bold;
        }

        .bubble {
            display: inline-block;
            padding: 11px 14px;
            border-radius: 10px;
            text-align: left;
            word-break: break-word;
            white-space: pre-wrap;
        }

        .customer .bubble {
            background: #2d3d53;
        }

        .admin .bubble {
            background: #3567a5;
        }

        .time {
            font-size: 10px;
            color: #718199;
            margin-top: 4px;
        }

        .empty {
            text-align: center;
            color: #718199;
            padding: 80px 20px;
        }

        .composer {
            display: flex;
            gap: 10px;
            padding: 15px;
            background: #202f43;
            border-top: 1px solid #34445a;
        }

        #messageInput {
            flex: 1;
            min-height: 45px;
            max-height: 120px;
            resize: vertical;
            border: 1px solid #506078;
            border-radius: 7px;
            background: #101827;
            color: white;
            padding: 12px;
            font-family: Arial, sans-serif;
            outline: none;
        }

        #messageInput:focus {
            border-color: #6e91bd;
        }

        #sendButton {
            width: 90px;
            border: none;
            border-radius: 7px;
            background: white;
            color: #101827;
            font-weight: bold;
            cursor: pointer;
        }

        #sendButton:disabled {
            opacity: 0.5;
            cursor: default;
        }

        #closedMessage {
            display: none;
            padding: 15px;
            text-align: center;
            color: #f0b5b5;
            background: #3a2025;
        }

        #loading {
            text-align: center;
            padding: 100px 20px;
            color: #9fb0c7;
        }

        #error {
            display: none;
            text-align: center;
            padding: 60px 20px;
            color: #ff9b9b;
        }

        #content {
            display: none;
        }

        @media (max-width: 700px) {

            header {
                padding: 0 15px;
            }

            header h2 {
                font-size: 16px;
            }

            .container {
                margin: 15px auto;
                padding: 0 10px;
            }

            .info {
                grid-template-columns: repeat(2, 1fr);
            }

            #messages {
                height: calc(100vh - 360px);
                min-height: 350px;
            }

            .message {
                max-width: 88%;
            }

            .composer {
                padding: 10px;
            }

            #sendButton {
                width: 70px;
            }
        }

    </style>

</head>

<body>

<header>

    <h2>MIR4 GOLD — ADMIN CHAT</h2>

    <button
        class="back"
        onclick="goBack()"
    >
        BACK
    </button>

</header>


<div class="container">

    <div id="loading">
        Loading order...
    </div>


    <div id="error"></div>


    <div id="content">

        <div class="order-card">

            <div
                id="orderNumber"
                class="order-number"
            >
                -
            </div>

            <div class="info">

                <div>
                    <div class="label">
                        CUSTOMER
                    </div>

                    <div
                        id="customer"
                        class="value"
                    >
                        -
                    </div>
                </div>


                <div>
                    <div class="label">
                        SERVER
                    </div>

                    <div
                        id="server"
                        class="value"
                    >
                        -
                    </div>
                </div>


                <div>
                    <div class="label">
                        GOLD
                    </div>

                    <div
                        id="gold"
                        class="value"
                    >
                        -
                    </div>
                </div>


                <div>
                    <div class="label">
                        STATUS
                    </div>

                    <div
                        id="status"
                        class="value"
                    >
                        -
                    </div>
                </div>

            </div>

        </div>


        <div class="chat-card">

            <div class="chat-title">
                ORDER CHAT
            </div>


            <div id="messages"></div>


            <div
                id="closedMessage"
            >
                This order is closed.
            </div>


            <div
                id="composer"
                class="composer"
            >

                <textarea
                    id="messageInput"
                    placeholder="Type your reply..."
                ></textarea>


                <button
                    id="sendButton"
                >
                    SEND
                </button>

            </div>

        </div>

    </div>

</div>


<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

<script src="admin-chat.js"></script>

</body>

</html>
