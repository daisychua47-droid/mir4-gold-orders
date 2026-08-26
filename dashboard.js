.unread-badge {
    display: inline-block;
    margin-left: 8px;
    padding: 4px 8px;
    border-radius: 12px;
    background: #dc2626;
    color: #ffffff;
    font-size: 10px;
    font-weight: bold;
    vertical-align: middle;
    animation: unreadPulse 1.5s infinite;
}

@keyframes unreadPulse {
    0%, 100% {
        opacity: 1;
    }

    50% {
        opacity: 0.65;
    }
}
