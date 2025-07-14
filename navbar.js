document.addEventListener("DOMContentLoaded", function () {
    fetch("navbar.html")
        .then(response => response.text())
        .then(data => {
            document.getElementById("navbar-container").innerHTML = data;

            // Aguarde um pequeno intervalo para garantir que o DOM seja atualizado
            setTimeout(() => {
                let logoutButton = document.getElementById('logout');
                let logoutModal = document.getElementById('logoutModal');

                if (logoutButton && logoutModal) {
                    logoutButton.addEventListener('click', function () {
                        new bootstrap.Modal(logoutModal).show();
                    });

                    document.getElementById('confirmLogout').addEventListener('click', function () {
                        localStorage.removeItem('token');
                        window.location.href = "login.html";
                    });
                } else {
                    console.error("Erro: Elementos do logout não encontrados.");
                }
            }, 200); // Pequeno delay para garantir que o navbar foi renderizado
        })
        .catch(error => console.error("Erro ao carregar a navbar:", error));
});