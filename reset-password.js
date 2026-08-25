const SUPABASE_URL =
    "https://osiixogirgixgqxfvsgw.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_gYNQ38R5yTs6gmX_o2H_iA_bf6nR1GW";


const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY
    );


const resetButton =
    document.getElementById("resetButton");

const message =
    document.getElementById("message");


resetButton.addEventListener(
    "click",
    async function () {

        const password =
            document.getElementById("password")
                .value;

        const confirmPassword =
            document.getElementById("confirmPassword")
                .value;


        if (!password || !confirmPassword) {

            message.textContent =
                "Please fill in both fields.";

            return;
        }


        if (password.length < 6) {

            message.textContent =
                "Password must be at least 6 characters.";

            return;
        }


        if (password !== confirmPassword) {

            message.textContent =
                "Passwords do not match.";

            return;
        }


        resetButton.disabled = true;

        resetButton.textContent =
            "UPDATING...";


        const { error } =
            await supabaseClient.auth
                .updateUser({
                    password: password
                });


        if (error) {

            message.textContent =
                error.message;

            resetButton.disabled = false;

            resetButton.textContent =
                "UPDATE PASSWORD";

            return;
        }


        message.textContent =
            "Password updated successfully!";


        setTimeout(
            function () {

                window.location.href =
                    "admin.html";

            },
            1500
        );

    }
);
