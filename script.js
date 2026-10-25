/* ========================================
   ELEMENTOS
========================================= */

const header =
    document.getElementById("header");


const mobileButton =
    document.getElementById("mobileButton");


const mobileMenu =
    document.getElementById("mobileMenu");



/* ========================================
   MENU MOBILE
========================================= */

function openMenu() {

    mobileMenu.classList.add(
        "active"
    );


    mobileButton.classList.add(
        "active"
    );


    mobileButton.setAttribute(
        "aria-expanded",
        "true"
    );


    document.body.classList.add(
        "menu-open"
    );

}



function closeMenu() {

    mobileMenu.classList.remove(
        "active"
    );


    mobileButton.classList.remove(
        "active"
    );


    mobileButton.setAttribute(
        "aria-expanded",
        "false"
    );


    document.body.classList.remove(
        "menu-open"
    );

}



function toggleMenu() {

    const menuIsOpen =
        mobileMenu
            .classList
            .contains(
                "active"
            );


    if (menuIsOpen) {

        closeMenu();

    }

    else {

        openMenu();

    }

}



mobileButton.addEventListener(
    "click",
    toggleMenu
);



/* ========================================
   FECHAR MENU AO CLICAR EM LINK
========================================= */

document
    .querySelectorAll(
        ".mobile-menu a"
    )
    .forEach(link => {

        link.addEventListener(
            "click",
            closeMenu
        );

    });



/* ========================================
   FECHAR MENU COM ESC
========================================= */

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Escape"
        ) {

            closeMenu();

        }

    }
);



/* ========================================
   FECHAR MENU SE VOLTAR PARA DESKTOP
========================================= */

window.addEventListener(
    "resize",
    () => {

        if (
            window.innerWidth > 1100
        ) {

            closeMenu();

        }

    }
);



/* ========================================
   HEADER AO ROLAR
========================================= */

function updateHeader() {

    if (
        window.scrollY > 25
    ) {

        header.classList.add(
            "scrolled"
        );

    }

    else {

        header.classList.remove(
            "scrolled"
        );

    }

}


window.addEventListener(
    "scroll",
    updateHeader,
    {
        passive: true
    }
);


updateHeader();



/* ========================================
   ANIMAÇÃO AO ENTRAR NA TELA
========================================= */

const revealElements =
    document.querySelectorAll(
        ".reveal"
    );


/*
    Caso IntersectionObserver
    não esteja disponível,
    mostramos tudo normalmente.
*/

if (
    "IntersectionObserver"
    in window
) {

    const observer =
        new IntersectionObserver(

            entries => {

                entries.forEach(
                    entry => {

                        if (
                            entry.isIntersecting
                        ) {

                            entry
                                .target
                                .classList
                                .add(
                                    "visible"
                                );


                            observer
                                .unobserve(
                                    entry.target
                                );

                        }

                    }
                );

            },

            {

                threshold:
                    0.10,

                rootMargin:
                    "0px 0px -30px 0px"

            }

        );


    revealElements.forEach(
        element => {

            observer.observe(
                element
            );

        }
    );

}

else {

    revealElements.forEach(
        element => {

            element
                .classList
                .add(
                    "visible"
                );

        }
    );

}



/* ========================================
   LINKS INTERNOS

   Garante fechamento do menu e
   comportamento correto das âncoras.
========================================= */

document
    .querySelectorAll(
        'a[href^="#"]'
    )
    .forEach(anchor => {

        anchor.addEventListener(
            "click",
            event => {

                const href =
                    anchor.getAttribute(
                        "href"
                    );


                if (
                    !href ||
                    href === "#"
                ) {

                    return;

                }


                const target =
                    document.querySelector(
                        href
                    );


                if (
                    !target
                ) {

                    return;

                }


                event.preventDefault();


                closeMenu();


                target.scrollIntoView({

                    behavior:
                        "smooth",

                    block:
                        "start"

                });

            }
        );

    });

/* =========================================================
   DASHBOARD DINÂMICO — ROASCE
========================================================= */

const performanceLine =
    document.getElementById("performanceLine");

const performanceArea =
    document.getElementById("performanceArea");

const performancePoint =
    document.getElementById("performancePoint");


/* =========================================================
   ELEMENTOS DAS MÉTRICAS
========================================================= */

const metricElements = {

    investment:
        document.getElementById("metricInvestment"),

    ctr:
        document.getElementById("metricCtr"),

    cost:
        document.getElementById("metricCost"),

    roas:
        document.getElementById("metricRoas")

};


/* =========================================================
   DIMENSÕES DO GRÁFICO
========================================================= */

const chartWidth = 700;

const chartBottom = 235;

const chartTop = 18;


/* =========================================================
   VALORES ATUAIS DO DASHBOARD
========================================================= */

let dashboardValues = {

    investment: 4853.72,

    ctr: 3.84,

    cost: 35.47,

    roas: 4.37

};


/* =========================================================
   HISTÓRICO INICIAL

   Tendência crescente, mas sem uma subida perfeita.
   Existem pequenas quedas naturais.
========================================================= */

let chartValues = [

    2.91,
    2.98,
    3.04,
    3.12,
    3.18,

    3.13, // queda

    3.24,
    3.31,
    3.38,
    3.46,

    3.41, // queda

    3.52,
    3.59,
    3.68,
    3.74,
    3.81,

    3.73, // queda maior

    3.86,
    3.94,
    4.01,
    4.08,

    4.04, // pequena queda

    4.13,
    4.21,
    4.27,
    4.34,

    4.28, // correção

    4.36,
    4.42,
    4.33,

    4.37
];


/* =========================================================
   ESCALA DO ROAS PARA O GRÁFICO
========================================================= */

function roasToY(value) {

    const minRoas = 2.0;

    const maxRoas = 6.0;


    const normalized =
        (
            value - minRoas
        )
        /
        (
            maxRoas - minRoas
        );


    const usableHeight =
        chartBottom - chartTop;


    return (
        chartBottom
        -
        normalized
        *
        usableHeight
    );

}


/* =========================================================
   CRIAÇÃO DO PATH
========================================================= */

function createChartPath(values) {

    const step =
        chartWidth
        /
        (
            values.length - 1
        );


    const points =
        values.map(
            (value, index) => {

                return {

                    x:
                        index * step,

                    y:
                        roasToY(value)

                };

            }
        );


    let path =
        `M ${points[0].x} ${points[0].y}`;


    /*
        Curva suave.

        Mantém pequenas oscilações sem parecer
        um gráfico totalmente artificial.
    */

    for (
        let i = 1;
        i < points.length - 1;
        i++
    ) {

        const current =
            points[i];

        const next =
            points[i + 1];


        const middleX =
            (
                current.x
                +
                next.x
            )
            / 2;


        const middleY =
            (
                current.y
                +
                next.y
            )
            / 2;


        path +=
            ` Q ${current.x} ${current.y} ${middleX} ${middleY}`;

    }


    const last =
        points[
            points.length - 1
        ];


    path +=
        ` T ${last.x} ${last.y}`;


    return {

        path,

        points

    };

}


/* =========================================================
   DESENHA O GRÁFICO
========================================================= */

function renderChart(values) {

    if (
        !performanceLine ||
        !performanceArea ||
        !performancePoint
    ) {

        return;

    }


    const result =
        createChartPath(values);


    performanceLine.setAttribute(
        "d",
        result.path
    );


    const first =
        result.points[0];


    const last =
        result.points[
            result.points.length - 1
        ];


    const areaPath =
        result.path
        +
        ` L ${last.x} 260`
        +
        ` L ${first.x} 260`
        +
        " Z";


    performanceArea.setAttribute(
        "d",
        areaPath
    );


    performancePoint.setAttribute(
        "cx",
        last.x
    );


    performancePoint.setAttribute(
        "cy",
        last.y
    );

}


/* =========================================================
   EASING
========================================================= */

function smoothEase(t) {

    return (
        t *
        t *
        (
            3 -
            2 * t
        )
    );

}


/* =========================================================
   INTERPOLAÇÃO DO GRÁFICO
========================================================= */

function interpolateArray(
    from,
    to,
    progress
) {

    return from.map(
        (value, index) => {

            return (
                value
                +
                (
                    to[index]
                    -
                    value
                )
                *
                progress
            );

        }
    );

}


/* =========================================================
   GERA O PRÓXIMO RESULTADO

   Aproximadamente:
   82% das atualizações = crescimento
   18% = queda/correção

   Isso cria uma tendência de alta sem deixar
   a linha artificialmente perfeita.
========================================================= */

function generateNextRoas() {

    const currentRoas =
        dashboardValues.roas;


    const chance =
        Math.random();


    let variation;


    /* -----------------------------------------
       QUEDA EVENTUAL
    ----------------------------------------- */

    if (
        chance < 0.18
    ) {

        variation =
            -(
                0.07
                +
                Math.random()
                *
                0.13
            );

    }


    /* -----------------------------------------
       MOVIMENTO NORMAL DE ALTA
    ----------------------------------------- */

    else {

        variation =
            0.035
            +
            Math.random()
            *
            0.095;

    }


    /*
        Depois de uma queda mais forte,
        aumentamos ligeiramente a chance
        de recuperação visual.
    */

    const previousRoas =
        chartValues[
            chartValues.length - 2
        ];


    if (
        currentRoas <
        previousRoas
    ) {

        variation +=
            0.035
            +
            Math.random()
            *
            0.045;

    }


    let nextRoas =
        currentRoas
        +
        variation;


    /*
        Limites apenas para o gráfico
        não escapar da escala visual.
    */

    nextRoas =
        Math.max(
            2.6,
            Math.min(
                5.65,
                nextRoas
            )
        );


    return nextRoas;

}


/* =========================================================
   GERA OS OUTROS DADOS A PARTIR DO RESULTADO
========================================================= */

function generateDashboardValues() {

    const newRoas =
        generateNextRoas();


    const roasDifference =
        newRoas
        -
        dashboardValues.roas;


    /* -----------------------------------------
       Investimento cresce gradualmente
    ----------------------------------------- */

    const investment =
        dashboardValues.investment
        +
        (
            8.37
            +
            Math.random()
            *
            29.46
        );


    /* -----------------------------------------
       CTR tende a acompanhar a performance
    ----------------------------------------- */

    let ctr =
        dashboardValues.ctr
        +
        roasDifference
        *
        0.32
        +
        (
            Math.random() - 0.5
        )
        *
        0.035;


    /* -----------------------------------------
       Custo tende a fazer movimento inverso
    ----------------------------------------- */

    let cost =
        dashboardValues.cost
        -
        roasDifference
        *
        3.15
        +
        (
            Math.random() - 0.5
        )
        *
        0.27;


    ctr =
        Math.max(
            2.5,
            Math.min(
                5.5,
                ctr
            )
        );


    cost =
        Math.max(
            24,
            Math.min(
                48,
                cost
            )
        );


    return {

        investment,

        ctr,

        cost,

        roas:
            newRoas

    };

}


/* =========================================================
   ANIMA O GRÁFICO

   O gráfico inteiro se desloca:
   primeiro ponto desaparece,
   todos andam uma posição,
   novo resultado entra à direita.
========================================================= */

function animateChartToRoas(
    newRoas
) {

    const startValues =
        [...chartValues];


    const targetValues =
        [

            ...chartValues.slice(1),

            newRoas

        ];


    /*
        Pequena movimentação também nos últimos
        pontos para evitar que só a ponta mexa.
    */

    for (
        let i =
            Math.max(
                0,
                targetValues.length - 7
            );

        i <
            targetValues.length - 1;

        i++
    ) {

        targetValues[i] +=
            (
                Math.random() - 0.5
            )
            *
            0.025;

    }


    const duration =
        2100;


    const startTime =
        performance.now();


    function animate(time) {

        const progress =
            Math.min(
                (
                    time
                    -
                    startTime
                )
                /
                duration,
                1
            );


        const eased =
            smoothEase(progress);


        const interpolated =
            interpolateArray(

                startValues,

                targetValues,

                eased

            );


        renderChart(
            interpolated
        );


        if (
            progress < 1
        ) {

            requestAnimationFrame(
                animate
            );

        }

        else {

            chartValues =
                targetValues;

        }

    }


    requestAnimationFrame(
        animate
    );

}


/* =========================================================
   FORMATAÇÃO DOS NÚMEROS
========================================================= */

function formatMoney(value) {

    return value.toLocaleString(
        "pt-BR",
        {

            style:
                "currency",

            currency:
                "BRL"

        }
    );

}


function formatPercentage(value) {

    return (
        value.toLocaleString(
            "pt-BR",
            {

                minimumFractionDigits:
                    2,

                maximumFractionDigits:
                    2

            }
        )
        +
        "%"
    );

}


function formatRoas(value) {

    return (
        value.toLocaleString(
            "pt-BR",
            {

                minimumFractionDigits:
                    2,

                maximumFractionDigits:
                    2

            }
        )
        +
        "x"
    );

}


/* =========================================================
   ANIMA OS NÚMEROS
========================================================= */

function animateMetric(
    element,
    start,
    end,
    formatter
) {

    if (
        !element
    ) {

        return;

    }


    const duration =
        2100;


    const startTime =
        performance.now();


    const card =
        element.closest(
            ".metric"
        );


    if (
        card
    ) {

        card.classList.add(
            "metric-updating"
        );

    }


    function update(time) {

        const progress =
            Math.min(
                (
                    time
                    -
                    startTime
                )
                /
                duration,
                1
            );


        const eased =
            smoothEase(progress);


        const current =
            start
            +
            (
                end
                -
                start
            )
            *
            eased;


        element.textContent =
            formatter(current);


        if (
            progress < 1
        ) {

            requestAnimationFrame(
                update
            );

        }

        else if (
            card
        ) {

            card.classList.remove(
                "metric-updating"
            );

        }

    }


    requestAnimationFrame(
        update
    );

}


/* =========================================================
   ATUALIZAÇÃO COMPLETA

   Números e gráfico recebem o mesmo resultado.
========================================================= */

function updateDashboard() {

    const previous =
        {
            ...dashboardValues
        };


    const next =
        generateDashboardValues();


    /* -----------------------------------------
       NÚMEROS
    ----------------------------------------- */

    animateMetric(

        metricElements.investment,

        previous.investment,

        next.investment,

        formatMoney

    );


    animateMetric(

        metricElements.ctr,

        previous.ctr,

        next.ctr,

        formatPercentage

    );


    animateMetric(

        metricElements.cost,

        previous.cost,

        next.cost,

        formatMoney

    );


    animateMetric(

        metricElements.roas,

        previous.roas,

        next.roas,

        formatRoas

    );


    /* -----------------------------------------
       GRÁFICO

       EXATAMENTE o mesmo ROAS.
    ----------------------------------------- */

    animateChartToRoas(
        next.roas
    );


    dashboardValues =
        next;

}


/* =========================================================
   INICIALIZAÇÃO
========================================================= */

renderChart(
    chartValues
);


/*
    Começa após 2 segundos
*/

setTimeout(
    () => {

        updateDashboard();


        /*
            Nova leitura aproximadamente
            a cada 3,8 segundos.
        */

        setInterval(

            updateDashboard,

            3800

        );

    },

    2000
);

/* =========================================================
   FORMULÁRIO DE CONTATO — FIREBASE
========================================================= */

const contactForm =
    document.getElementById(
        "contactForm"
    );


if (contactForm) {

   function resetContactVerification() {

    const widget =
        contactForm?.querySelector(
            ".cf-turnstile"
        );

    if (
        widget
        &&
        window.turnstile
        &&
        typeof window.turnstile.reset ===
            "function"
    ) {
        /*
           A página possui apenas
           um widget Turnstile.
        */

        window.turnstile.reset();
    }

}

    contactForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            const submitButton =
                contactForm.querySelector(
                    ".contact-submit"
                );

           if (submitButton.disabled) {
                return;
            }

            const submitText =
                submitButton.querySelector(
                    "span:first-child"
                );


            /* -----------------------------------------
               CAMPOS
            ----------------------------------------- */

            const name =
                document
                    .getElementById("contactName")
                    .value
                    .trim();


            const company =
                document
                    .getElementById("contactCompany")
                    .value
                    .trim();


            const contact =
                document
                    .getElementById("contactMethod")
                    .value
                    .trim();


            const service =
                document
                    .getElementById("contactService")
                    .value;


            const message =
                document
                    .getElementById("contactMessage")
                    .value
                    .trim();
            
            
            const turnstileToken =
                document
                    .querySelector(
                        '[name="cf-turnstile-response"]'
                    )
                    ?.value;
            
            
            /* -----------------------------------------
               VERIFICA TURNSTILE
            ----------------------------------------- */
            
            if (!turnstileToken) {
            
                submitText.textContent =
                    "Verificação necessária";
            
                submitButton.disabled =
                    false;
            
                return;
            
            }
            
            
            /* -----------------------------------------
               ESTADO DE ENVIO
            ----------------------------------------- */
            
            submitButton.disabled = true;
            
            submitText.textContent =
                "Enviando...";
            
            
            try {
            
                const response =
                    await fetch(
                        "/api/contact",
                        {
            
                            method:
                                "POST",
            
                            headers: {
            
                                "Content-Type":
                                    "application/json"
            
                            },
            
                            body:
                                JSON.stringify({
            
                                    name,
                                    company,
                                    contact,
                                    service,
                                    message,
                                    turnstileToken
            
                                })
            
                        }
                    );


                const result =
                    await response.json();


                if (!response.ok) {

                    throw new Error(
                        result.message ||
                        "Erro ao enviar formulário."
                    );

                }


                /* -----------------------------------------
                   SUCESSO
                ----------------------------------------- */

                submitText.textContent =
                    "Mensagem enviada ✓";


                contactForm.reset();


                setTimeout(
                    () => {

                        submitText.textContent =
                            "Enviar mensagem";

                        submitButton.disabled =
                            false;

                    },
                    3000
                );

            }

            catch (error) {

                console.error(
                    "Erro no formulário:",
                    error
                );


                submitText.textContent =
                    "Tente novamente";


                setTimeout(
                    () => {

                        submitText.textContent =
                            "Enviar mensagem";

                        submitButton.disabled =
                            false;

                    },
                    3000
                );

            }

           finally {
                resetContactVerification();
            }

        }
    );

}

/* =========================================================
   WHATSAPP FLUTUANTE
========================================================= */

const whatsappWidget =
    document.getElementById(
        "whatsappWidget"
    );


if (whatsappWidget) {

    setTimeout(
        () => {

            whatsappWidget.classList.add(
                "visible"
            );

        },
        2500
    );

}
