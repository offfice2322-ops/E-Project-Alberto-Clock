import { products } from "./data.js"

const CART_STORAGE_KEY = "albertoCartItems"
const SELECTED_PRODUCT_KEY = "albertoSelectedProduct"

const formatCurrency = (value) =>
    new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
    }).format(value)

const sanitizeCartItems = (items) =>
    (Array.isArray(items) ? items : [])
        .map((item) => ({
            ...item,
            quantity: Number(item.quantity ?? 0),
        }))
        .filter((item) => Number.isFinite(item.quantity) && item.quantity >= 0)

const getCartItems = () => {
    try {
        const cart = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || "[]")
        return sanitizeCartItems(cart)
    } catch {
        return []
    }
}

const saveCartItems = (items) => {
    const safeItems = sanitizeCartItems(items)
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(safeItems))
}

const updateCartBadge = () => {
    const totalItems = getCartItems().reduce((sum, item) => sum + Number(item.quantity ?? 0), 0)
    document.querySelectorAll("[data-cart-count]").forEach((badge) => {
        badge.textContent = totalItems
    })
}

const addToCart = (product) => {
    const cart = getCartItems()
    const existingItem = cart.find((item) => item.id === product.id)

    if (existingItem) {
        existingItem.quantity = Number(existingItem.quantity || 0) + 1
    } else {
        cart.push({ ...product, quantity: 1 })
    }

    saveCartItems(cart)
    updateCartBadge()
}

const INITIAL_PRODUCTS_TO_SHOW = 8
const PRODUCTS_PER_LOAD = 4
const PRODUCT_PAGE_LOAD = 8
const MAX_MORE_LOADS = 4

let currentBrandFilter = "all"
let currentLineupFilter = "all"
let currentSearchTerm = ""
let currentVisibleCount = INITIAL_PRODUCTS_TO_SHOW

const getProductLineup = (product) => {
    if (["Rolex", "Omega"].includes(product.brand)) return "Vintage"
    if (["Cartier", "Rado"].includes(product.brand)) return "Luxury"
    if (["Citizen", "Seiko"].includes(product.brand)) return "Smart Watches"
    return "Sport"
}

const renderProductCards = (selectedBrand = "all", resetVisible = true) => {
    const productCard = document.getElementById("product-cards")
    if (!productCard) return

    const isBrandPage = document.body.dataset.brandPage === "true"
    const isProductPage = document.body.dataset.productPage === "true"
    if (resetVisible) {
        currentVisibleCount = isBrandPage ? products.length : INITIAL_PRODUCTS_TO_SHOW
    }

    currentBrandFilter = selectedBrand

    const brandProducts = selectedBrand === "all"
        ? products
        : products.filter((product) => product.brand.toLowerCase() === selectedBrand.toLowerCase())
    const filteredProducts = currentLineupFilter === "all"
        ? brandProducts
        : brandProducts.filter((product) => getProductLineup(product) === currentLineupFilter)
    const searchedProducts = currentSearchTerm
        ? filteredProducts.filter((product) => `${product.name} ${product.brand} ${product.desc}`.toLowerCase().includes(currentSearchTerm))
        : filteredProducts

    const maxVisibleCount = isBrandPage || isProductPage
        ? filteredProducts.length
        : Math.min(filteredProducts.length, INITIAL_PRODUCTS_TO_SHOW + (PRODUCTS_PER_LOAD * MAX_MORE_LOADS))
    const maxVisibleSearchCount = isBrandPage || isProductPage
        ? searchedProducts.length
        : Math.min(searchedProducts.length, INITIAL_PRODUCTS_TO_SHOW + (PRODUCTS_PER_LOAD * MAX_MORE_LOADS))
    const displayedProducts = searchedProducts.slice(0, Math.min(currentVisibleCount, maxVisibleSearchCount))

    const heading = document.querySelector("[data-product-heading]")
    if (heading) {
        heading.textContent = currentLineupFilter !== "all"
            ? `${currentLineupFilter} Watches`
            : selectedBrand === "all" ? "All Watches" : selectedBrand
    }

    productCard.innerHTML = displayedProducts
        .map((product) => {
            const indicatorButtons = product.images
                .map((_, index) => `
                    <button type="button" data-bs-target="#watchCarousel${product.id}" data-bs-slide-to="${index}" class="${index === 0 ? "active" : ""}"></button>
                `)
                .join("")

            const slides = product.images
                .map((image, index) => `
                    <div class="carousel-item ${index === 0 ? "active" : ""}">
                        <img src="${image}" class="d-block w-100 product-carousel-image" alt="${product.name}">
                    </div>
                `)
                .join("")

            return `
                <div class="col">
                    <div class="card h-100 product-card">
                        <div id="watchCarousel${product.id}" class="carousel carousel-dark slide" data-bs-ride="carousel">
                            <div class="carousel-indicators">
                                ${indicatorButtons}
                            </div>

                            <div class="carousel-inner">
                                ${slides}
                            </div>

                            <button class="carousel-control-prev" type="button" data-bs-target="#watchCarousel${product.id}" data-bs-slide="prev">
                                <span class="carousel-control-prev-icon"></span>
                                <span class="visually-hidden">Previous</span>
                            </button>

                            <button class="carousel-control-next" type="button" data-bs-target="#watchCarousel${product.id}" data-bs-slide="next">
                                <span class="carousel-control-next-icon"></span>
                                <span class="visually-hidden">Next</span>
                            </button>
                        </div>

                        <div class="card-body">
                            <h5 class="card-title">${product.name}</h5>
                            <p class="card-text">${product.desc}</p>
                            <p class="fw-bold text-warning mb-0">${formatCurrency(product.price)}</p>
                        </div>

                        <div class="card-footer bg-transparent border-0">
                            <button class="btn btn-gold w-100" data-product-id="${product.id}">View Details</button>
                        </div>
                    </div>
                </div>
            `
        })
        .join("")

    const moreButton = document.getElementById("load-more-products")
    const lessButton = document.getElementById("load-less-products")
    if (moreButton) {
        moreButton.style.display = currentVisibleCount < maxVisibleSearchCount ? "inline-flex" : "none"
    }
    if (lessButton) {
        lessButton.style.display = currentVisibleCount > INITIAL_PRODUCTS_TO_SHOW ? "inline-flex" : "none"
    }
}

const renderDetailPage = () => {
    const detailContainer = document.getElementById("product-detail")
    if (!detailContainer) return

    const params = new URLSearchParams(window.location.search)
    const productId = Number(params.get("id"))
    const product = products.find((item) => item.id === productId)

    if (!product) {
        detailContainer.innerHTML = `
            <div class="alert alert-warning">
                Product not found. <a href="index.html" class="text-decoration-underline">Back to products</a>
            </div>
        `
        return
    }

    const imageGallery = product.images
        .map(
            (image, index) => `
                <div class="col-6 mb-3">
                    <img src="${image}" class="img-fluid detail-thumb ${index === 0 ? "active" : ""}" alt="${product.name}">
                </div>
            `
        )
        .join("")

    detailContainer.innerHTML = `
        <div class="row g-4 align-items-center">
            <div class="col-lg-7">
                <div class="detail-main-image-wrap">
                    <img src="${product.images[0]}" class="img-fluid detail-main-image" alt="${product.name}">
                </div>
                <div class="row detail-image-gallery mt-3">${imageGallery}</div>
            </div>

            <div class="col-lg-5">
                <span class="badge bg-warning text-dark mb-3">${product.brand}</span>
                <h1 class="mb-3">${product.name}</h1>
                <h3 class="text-warning mb-3">${formatCurrency(product.price)}</h3>
                <p class="text-light mb-4">${product.desc}</p>

                <div class="d-flex flex-wrap gap-2 mb-4">
                    <button type="button" id="add-to-cart-button" class="btn btn-gold btn-lg" data-add-to-cart="${product.id}">Add to cart</button>
                    <a href="index.html" class="btn btn-outline-light btn-lg">Continue shopping</a>
                </div>

                <ul class="list-unstyled detail-specs text-light">
                    <li><strong>Brand:</strong> ${product.brand}</li>
                    <li><strong>Collection:</strong> Premium Luxury</li>
                    <li><strong>Condition:</strong> New</li>
                    <li><strong>Warranty:</strong> 12 Months</li>
                </ul>
            </div>
        </div>
    `

    const mainImage = document.querySelector(".detail-main-image")
    document.querySelectorAll(".detail-thumb").forEach((thumb) => {
        thumb.addEventListener("click", () => {
            if (mainImage) mainImage.src = thumb.src
        })
    })

    const addToCartButton = document.getElementById("add-to-cart-button")
    if (addToCartButton) {
        addToCartButton.setAttribute("data-add-to-cart", String(product.id))
    }
}

const showProductModal = (product) => {
    const modal = document.getElementById("product-details-modal")
    const modalBody = document.getElementById("product-details-body")
    const modalTitle = document.getElementById("product-details-title")
    if (!modal || !modalBody || !window.bootstrap) return false

    modalTitle.textContent = product.name
    modalBody.innerHTML = `
        <div class="modal-product-grid">
            <img src="${product.images[0]}" class="modal-product-image" alt="${product.name}">
            <div>
                <span class="badge bg-warning text-dark mb-3">${product.brand} / ${getProductLineup(product)}</span>
                <p class="modal-product-description">${product.desc}</p>
                <p class="modal-product-price">${formatCurrency(product.price)}</p>
                <p class="modal-product-meta">Gallery: ${product.images.length} images · 12-month warranty · New condition</p>
                <div class="d-flex flex-wrap gap-2">
                    <button type="button" class="btn btn-gold" data-add-to-cart="${product.id}" data-bs-dismiss="modal">Add to cart</button>
                    <a href="detail.html?id=${product.id}" class="btn btn-outline-light">Open full gallery</a>
                </div>
            </div>
        </div>
    `
    window.bootstrap.Modal.getOrCreateInstance(modal).show()
    return true
}

const initialiseVisitorCounter = () => {
    const brand = document.querySelector(".navbar-brand")
    if (!brand || brand.querySelector("[data-visitor-count]")) return

    let visits = Number(localStorage.getItem("albertoVisitorCount") || 0)
    if (!sessionStorage.getItem("albertoVisitRecorded")) {
        visits += 1
        localStorage.setItem("albertoVisitorCount", String(visits))
        sessionStorage.setItem("albertoVisitRecorded", "true")
    }

    const counter = document.createElement("span")
    counter.className = "visitor-count"
    counter.innerHTML = `Visitors <strong data-visitor-count>${visits}</strong>`
    brand.append(counter)
}

const initialiseNavbarState = () => {
    const navbarLinks = document.querySelectorAll(".navbar .nav-link")
    const updateActiveLink = () => {
        if (!window.location.hash) return

        const currentUrl = new URL(window.location.href)
        navbarLinks.forEach((link) => {
            const linkUrl = new URL(link.getAttribute("href"), currentUrl)
            link.classList.toggle("active", linkUrl.pathname === currentUrl.pathname && linkUrl.hash === currentUrl.hash)
        })
    }

    updateActiveLink()
    window.addEventListener("hashchange", updateActiveLink)
}

const initialiseTicker = () => {
    const ticker = document.createElement("div")
    ticker.className = "live-ticker"
    ticker.setAttribute("aria-live", "polite")
    ticker.innerHTML = '<div class="live-ticker-track"><span>ALBERTO CLOCKS LIVE</span><span data-live-time></span><span data-live-location>Location: locating...</span></div>'
    document.body.append(ticker)

    const timeElement = ticker.querySelector("[data-live-time]")
    const updateTime = () => {
        timeElement.textContent = new Intl.DateTimeFormat(undefined, {
            dateStyle: "medium",
            timeStyle: "medium",
        }).format(new Date())
    }
    updateTime()
    window.setInterval(updateTime, 1000)

    const locationElement = ticker.querySelector("[data-live-location]")
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            ({ coords }) => {
                locationElement.textContent = `Location: ${coords.latitude.toFixed(2)}, ${coords.longitude.toFixed(2)}`
            },
            () => {
                locationElement.textContent = "Location: unavailable"
            },
            { timeout: 8000 }
        )
    } else {
        locationElement.textContent = "Location: unavailable"
    }
}

const renderCartPage = () => {
    const cartItemsContainer = document.getElementById("cart-items")
    const cartSummary = document.getElementById("cart-summary")
    if (!cartItemsContainer || !cartSummary) return

    const cartItems = getCartItems().filter((item) => Number(item.quantity || 0) > 0)

    if (!cartItems.length) {
        cartItemsContainer.innerHTML = `
            <div class="empty-cart text-center py-5">
                <h3>Your cart is empty</h3>
                <p class="text-muted">Add a few watches to get started.</p>
                <a href="index.html" class="btn btn-gold">Continue shopping</a>
            </div>
        `
        cartSummary.innerHTML = ""
        return
    }

    const total = cartItems.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity || 1), 0)

    cartItemsContainer.innerHTML = cartItems
        .map(
            (item) => `
                <div class="cart-item-row d-flex flex-column flex-md-row align-items-center justify-content-between gap-3 p-3 mb-3">
                    <div class="cart-item-product d-flex align-items-center gap-3">
                        <img src="${item.thumbnail || item.images?.[0] || ""}" alt="${item.name}" class="cart-product-image">
                        <div>
                            <h5 class="mb-1">${item.name}</h5>
                            <p class="mb-0 text-muted">${item.brand}</p>
                        </div>
                    </div>

                    <div class="cart-item-quantity d-flex align-items-center gap-2">
                        <button type="button" class="btn btn-outline-light btn-sm" data-change-qty="${item.id}" data-direction="-1">-</button>
                        <span class="qty-value">${item.quantity}</span>
                        <button type="button" class="btn btn-outline-light btn-sm" data-change-qty="${item.id}" data-direction="1">+</button>
                    </div>

                    <div class="cart-item-total text-md-end">
                        <p class="mb-1 fw-bold">${formatCurrency(Number(item.price) * Number(item.quantity || 1))}</p>
                        <button type="button" class="btn btn-link text-danger p-0" data-remove-from-cart="${item.id}">Remove</button>
                    </div>
                </div>
            `
        )
        .join("")

    cartSummary.innerHTML = `
        <div class="summary-box p-4 rounded-4">
            <h4 class="mb-3">Order summary</h4>
            <div class="d-flex justify-content-between mb-2"><span>Subtotal</span><span>${formatCurrency(total)}</span></div>
            <div class="d-flex justify-content-between mb-2"><span>Delivery</span><span>Free for all</span></div>
            <hr>
            <div class="d-flex justify-content-between fw-bold fs-5"><span>Total</span><span>${formatCurrency(total)}</span></div>

            <form class="checkout-form mt-4">
                <div class="mb-3">
                    <label class="form-label">Full name</label>
                    <input type="text" class="form-control" placeholder="Your full name" />
                </div>
                <div class="mb-3">
                    <label class="form-label">Phone</label>
                    <input type="tel" class="form-control" placeholder="Mobile number" />
                </div>
                <div class="mb-3">
                    <label class="form-label">Email</label>
                    <input type="email" class="form-control" placeholder="Email address" />
                </div>
                <div class="mb-3">
                    <label class="form-label">Delivery address</label>
                    <textarea class="form-control" rows="3" placeholder="Street address, city, postcode"></textarea>
                </div>

                <div class="mb-3">
                    <label class="form-label d-block">Payment method</label>
                    <div class="payment-option">
                        <input type="radio" name="payment" id="payment-card" checked />
                        <label for="payment-card">Credit / Debit Card</label>
                    </div>
                    <div class="payment-option">
                        <input type="radio" name="payment" id="payment-paypal" />
                        <label for="payment-paypal">PayPal</label>
                    </div>
                    <div class="payment-option">
                        <input type="radio" name="payment" id="payment-cod" />
                        <label for="payment-cod">Cash on Delivery</label>
                    </div>
                </div>

                <button type="submit" class="btn btn-gold w-100 mt-2">Place order</button>
            </form>
        </div>
    `
}

const showFormMessage = (form, message, type = "success") => {
    form.querySelector("[data-form-message]")?.remove()
    const messageElement = document.createElement("div")
    messageElement.className = `alert alert-${type} mt-3`
    messageElement.dataset.formMessage = "true"
    messageElement.textContent = message
    form.append(messageElement)
}

document.addEventListener("click", (event) => {
    const addButton = event.target.closest("[data-add-to-cart]")
    if (addButton) {
        const selectedProduct = products.find((product) => product.id === Number(addButton.dataset.addToCart))
        if (selectedProduct) addToCart(selectedProduct)
        return
    }

    const removeButton = event.target.closest("[data-remove-from-cart]")
    if (removeButton) {
        const cart = getCartItems().filter((item) => item.id !== Number(removeButton.dataset.removeFromCart))
        saveCartItems(cart)
        renderCartPage()
        updateCartBadge()
        return
    }

    const qtyButton = event.target.closest("[data-change-qty]")
    if (qtyButton) {
        const desiredId = Number(qtyButton.dataset.changeQty)
        const direction = Number(qtyButton.dataset.direction)
        const cart = getCartItems()
        const itemIndex = cart.findIndex((item) => item.id === desiredId)

        if (itemIndex >= 0) {
            const nextQuantity = Number(cart[itemIndex].quantity ?? 0) + direction
            cart[itemIndex].quantity = Math.max(1, nextQuantity)
            saveCartItems(cart)
            renderCartPage()
            updateCartBadge()
        }
    }
})

document.addEventListener("click", (event) => {
    const productButton = event.target.closest("[data-product-id]")
    if (productButton) {
        const selectedProduct = products.find((product) => product.id === Number(productButton.dataset.productId))
        if (!selectedProduct) return

        localStorage.setItem(SELECTED_PRODUCT_KEY, JSON.stringify(selectedProduct.id))
        if (showProductModal(selectedProduct)) return
        window.location.href = `detail.html?id=${selectedProduct.id}`
        return
    }

    const loadMoreButton = event.target.closest("#load-more-products")
    if (loadMoreButton) {
        const isProductPage = document.body.dataset.productPage === "true"
        const brandProducts = currentBrandFilter === "all"
            ? products
            : products.filter((product) => product.brand.toLowerCase() === currentBrandFilter.toLowerCase())
        const filteredProducts = currentLineupFilter === "all"
            ? brandProducts
            : brandProducts.filter((product) => getProductLineup(product) === currentLineupFilter)

        const loadSize = isProductPage ? PRODUCT_PAGE_LOAD : PRODUCTS_PER_LOAD
        const maxVisibleCount = isProductPage
            ? filteredProducts.length
            : Math.min(filteredProducts.length, INITIAL_PRODUCTS_TO_SHOW + (PRODUCTS_PER_LOAD * MAX_MORE_LOADS))
        if (currentVisibleCount < maxVisibleCount) {
            currentVisibleCount = Math.min(currentVisibleCount + loadSize, maxVisibleCount)
            renderProductCards(currentBrandFilter, false)
        }
        return
    }

    const loadLessButton = event.target.closest("#load-less-products")
    if (loadLessButton) {
        const isProductPage = document.body.dataset.productPage === "true"
        const loadSize = isProductPage ? PRODUCT_PAGE_LOAD : PRODUCTS_PER_LOAD
        currentVisibleCount = Math.max(currentVisibleCount - loadSize, INITIAL_PRODUCTS_TO_SHOW)
        renderProductCards(currentBrandFilter, false)
        return
    }

    const allProductsLink = event.target.closest("[data-show-all-products]")
    if (allProductsLink) {
        event.preventDefault()
        currentSearchTerm = ""
        currentLineupFilter = "all"
        renderProductCards("all", false)
        const cardsSection = document.getElementById("product-cards")
        if (cardsSection) cardsSection.scrollIntoView({ behavior: "smooth", block: "start" })
        return
    }

    const brandLink = event.target.closest("[data-brand]")
    if (brandLink && brandLink.getAttribute("href")?.startsWith("#")) {
        event.preventDefault()
        currentSearchTerm = ""
        const selectedBrand = brandLink.dataset.brand
        renderProductCards(selectedBrand)
        const cardsSection = document.getElementById("product-cards")
        if (cardsSection) cardsSection.scrollIntoView({ behavior: "smooth", block: "start" })
    }

    const lineupButton = event.target.closest("[data-lineup]")
    if (lineupButton) {
        currentLineupFilter = lineupButton.dataset.lineup
        currentBrandFilter = "all"
        currentVisibleCount = document.body.dataset.productPage === "true"
            ? INITIAL_PRODUCTS_TO_SHOW
            : currentLineupFilter === "all"
                ? INITIAL_PRODUCTS_TO_SHOW
                : products.filter((product) => getProductLineup(product) === currentLineupFilter).length
        document.querySelectorAll("[data-lineup]").forEach((button) => button.classList.toggle("active", button === lineupButton))
        renderProductCards("all", false)
        document.getElementById("lineups")?.scrollIntoView({ behavior: "smooth", block: "start" })
    }
})

document.addEventListener("submit", (event) => {
    const form = event.target

    if (form.matches('form[role="search"]')) {
        event.preventDefault()
        const query = new FormData(form).get("search")?.toString().trim().toLowerCase()
            || form.querySelector("input[type=search]")?.value.trim().toLowerCase()
        if (!query) return
        form.reset()

        if (!document.getElementById("product-cards")) {
            window.location.href = `index.html?search=${encodeURIComponent(query)}`
            return
        }

        currentSearchTerm = query
        currentBrandFilter = "all"
        currentLineupFilter = "all"
        currentVisibleCount = INITIAL_PRODUCTS_TO_SHOW
        renderProductCards("all")
        document.getElementById("product-cards")?.scrollIntoView({ behavior: "smooth", block: "start" })
        return
    }

    if (form.matches(".checkout-form")) {
        event.preventDefault()
        showFormMessage(form, "Thank you. Your order request has been received.")
        form.reset()
        return
    }

    if (form.closest("main")?.querySelector("h1")?.textContent.includes("Contact")) {
        event.preventDefault()
        showFormMessage(form, "Thank you. We will reply to your message shortly.")
        form.reset()
    }
})

document.addEventListener("DOMContentLoaded", () => {
    const isBrandPage = document.body.dataset.brandPage === "true"
    const params = new URLSearchParams(window.location.search)
    const brandFromUrl = params.get("brand")
    currentSearchTerm = params.get("search")?.trim().toLowerCase() || ""
    const selectedBrand = isBrandPage && brandFromUrl ? brandFromUrl : "all"

    renderProductCards(selectedBrand)
    if (isBrandPage) {
        document.title = `${selectedBrand} Watches - Alberto Clocks`
    }
    renderDetailPage()
    renderCartPage()
    updateCartBadge()
    initialiseVisitorCounter()
    initialiseNavbarState()
    initialiseTicker()
})

