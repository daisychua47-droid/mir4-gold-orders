const SUPABASE_URL = "https://osiixogirgixgqxfvsgw.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_gYNQ38R5yTs6gmX_o2H_iA_bf6nR1GW";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);


const loginForm = document.getElementById("loginForm");
const loginButton = document.getElementById("loginButton");
const message = document.getElementById("message");


loginForm.addEventListener("submit", async function(event) {

    event.preventDefault();

    const email =
        document.getElementById("email").value.trim();

    const password =
        document.getElementById("password").value;


    loginButton.disabled = true;
    loginButton.textContent = "LOGGING IN...";
    message.textContent = "";


    const { data, error } =
        await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });


    if (error) {

        console.error(error);

        message.textContent =
            "Invalid email or password.";

        loginButton.disabled = false;
        loginButton.textContent = "LOGIN";

        return;
    }


    // Check that the logged-in user is actually an admin
    const { data: adminData, error: adminError } =
        await supabaseClient
            .from("admin_users")
            .select("id")
            .eq("id", data.user.id)
            .maybeSingle();


    if (adminError || !adminData) {

        await supabaseClient.auth.signOut();

        message.textContent =
            "This account is not authorized as an admin.";

        loginButton.disabled = false;
        loginButton.textContent = "LOGIN";

        return;
    }


    // Login successful
    window.location.href = "dashboard.html";

});


const forgotPassword =
    document.getElementById("forgotPassword");


if (forgotPassword) {

    forgotPassword.addEventListener(
        "click",
        async function () {

            const email =
                document.getElementById("email").value.trim();


            if (!email) {

                alert(
                    "Please enter your admin email first."
                );

                return;
            }


            const { error } =
                await supabaseClient.auth
                    .resetPasswordForEmail(
                        email,
                        {
                            redirectTo:
                                window.location.origin +
                                "/mir4-gold-orders/reset-password.html"
                        }
                    );


            if (error) {

                alert(
                    "Unable to send reset email.\n\n" +
                    error.message
                );

                return;
            }


            alert(
                "Password reset email sent!\n\n" +
                "Please check your email."
            );
        }
    );
}
