/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const selectedProductsList = document.getElementById("selectedProductsList");

// Store selected products in an array
let selectedProducts = [];

// Store chat history for OpenAI API
let chatHistory = [];

// Load selected products from localStorage
function loadSelectedProducts() {
  const saved = localStorage.getItem("selectedProducts");
  if (saved) {
    try {
      selectedProducts = JSON.parse(saved);
    } catch (e) {
      selectedProducts = [];
    }
  }
}

// Save selected products to localStorage
function saveSelectedProducts() {
  localStorage.setItem("selectedProducts", JSON.stringify(selectedProducts));
}

/* Show initial placeholder until user selects a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

/* Load product data from JSON file */
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  return data.products;
}

// Store all loaded products for searching
let allProducts = [];
let currentCategory = "";
let currentSearch = "";

// Helper to filter products by category and search
function getFilteredProducts() {
  let filtered = allProducts;
  // If 'all' is selected or nothing, show all products
  if (currentCategory && currentCategory !== "all") {
    filtered = filtered.filter(
      (product) => product.category === currentCategory
    );
  }
  if (currentSearch) {
    const searchLower = currentSearch.toLowerCase();
    filtered = filtered.filter(
      (product) =>
        product.name.toLowerCase().includes(searchLower) ||
        product.brand.toLowerCase().includes(searchLower) ||
        (product.description &&
          product.description.toLowerCase().includes(searchLower))
    );
  }
  return filtered;
}

/* Display product cards and handle selection */
/* Display product cards and handle selection and description toggle */
function displayProducts(products) {
  productsContainer.innerHTML = products
    .map((product) => {
      // Check if product is selected
      const isSelected = selectedProducts.some((p) => p.id === product.id);
      return `
    <div class="product-card${isSelected ? " selected" : ""}" data-id="${
        product.id
      }">
      <img src="${product.image}" alt="${product.name}">
      <div class="product-info">
        <h3>${product.name}</h3>
        <p>${product.brand}</p>
        <button class="desc-toggle-btn" data-id="${
          product.id
        }" aria-haspopup="dialog">
          Show Info
        </button>
      </div>
    </div>
  `;
    })
    .join("");

  // Add click event listeners to each product card
  const productCards = document.querySelectorAll(".product-card");
  productCards.forEach((card) => {
    card.addEventListener("click", (event) => {
      // Prevent selection if clicking the description toggle button
      if (event.target.classList.contains("desc-toggle-btn")) return;
      const productId = parseInt(card.getAttribute("data-id"));
      // Find product by id
      const product = products.find((p) => p.id === productId);
      if (!product) return;

      // If already selected, unselect it
      const index = selectedProducts.findIndex((p) => p.id === productId);
      if (index > -1) {
        selectedProducts.splice(index, 1);
      } else {
        selectedProducts.push(product);
      }
      saveSelectedProducts();
      // Update visuals and selected list
      displayProducts(products);
      updateSelectedProducts();
    });
  });

  // Add click event listeners to description toggle buttons
  const descBtns = document.querySelectorAll(".desc-toggle-btn");
  descBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const productId = parseInt(btn.getAttribute("data-id"));
      // Find product by id
      const product = products.find((p) => p.id === productId);
      if (!product) return;
      showProductModal(product);
    });
  });
}

// Show product info in a modal popup
function showProductModal(product) {
  // Create overlay
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.tabIndex = -1;

  // Create modal card
  const modal = document.createElement("div");
  modal.className = "modal-card";
  modal.innerHTML = `
    <button class="close-modal-btn" aria-label="Close Info" tabindex="0">
      <i class="fa-solid fa-xmark"></i>
    </button>
    <img src="${product.image}" alt="${product.name}">
    <h3>${product.name}</h3>
    <p>${product.brand}</p>
    <div class="modal-desc">${product.description}</div>
  `;

  // Add close button event
  modal.querySelector(".close-modal-btn").addEventListener("click", () => {
    document.body.removeChild(overlay);
  });

  // Close modal on overlay click
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      document.body.removeChild(overlay);
    }
  });

  // Trap focus inside modal for accessibility
  setTimeout(() => {
    modal.querySelector(".close-modal-btn").focus();
  }, 10);

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Close modal on Escape key
  function handleKey(e) {
    if (e.key === "Escape") {
      if (document.body.contains(overlay)) {
        document.body.removeChild(overlay);
      }
    }
  }
  document.addEventListener("keydown", handleKey);
  // Remove event listener when modal closes
  overlay.addEventListener("transitionend", () => {
    document.removeEventListener("keydown", handleKey);
  });
}

/* Update the Selected Products section */
function updateSelectedProducts() {
  if (selectedProducts.length === 0) {
    selectedProductsList.innerHTML = `<div class="placeholder-message">No products selected</div>
      <button id="clearSelections" class="generate-btn" style="margin-top:16px;background:#e3a535;">Clear All</button>`;
    document.getElementById("clearSelections").addEventListener("click", () => {
      selectedProducts = [];
      saveSelectedProducts();
      updateSelectedProducts();
      // Re-display products if a category is selected
      const selectedCategory = categoryFilter.value;
      if (selectedCategory) {
        loadProducts().then((products) => {
          const filteredProducts = products.filter(
            (product) => product.category === selectedCategory
          );
          displayProducts(filteredProducts);
        });
      }
    });
    return;
  }
  selectedProductsList.innerHTML =
    selectedProducts
      .map(
        (product) => `
      <div class="selected-product-item">
        <img src="${product.image}" alt="${product.name}">
        <span>${product.name}</span>
        <button class="remove-btn" data-id="${product.id}" title="Remove">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
    `
      )
      .join("") +
    `<button id="clearSelections" class="generate-btn" style="margin-top:16px;background:#e3a535;">Clear All</button>`;

  // Add click event listeners to remove buttons
  const removeBtns = document.querySelectorAll(".remove-btn");
  removeBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation(); // Prevent card click
      const productId = parseInt(btn.getAttribute("data-id"));
      selectedProducts = selectedProducts.filter((p) => p.id !== productId);
      saveSelectedProducts();
      updateSelectedProducts();
      // Also update product grid highlight
      // Re-display products if a category is selected
      const selectedCategory = categoryFilter.value;
      if (selectedCategory) {
        loadProducts().then((products) => {
          const filteredProducts = products.filter(
            (product) => product.category === selectedCategory
          );
          displayProducts(filteredProducts);
        });
      }
    });
  });
  // Add event listener to clear all button
  document.getElementById("clearSelections").addEventListener("click", () => {
    selectedProducts = [];
    saveSelectedProducts();
    updateSelectedProducts();
    // Re-display products if a category is selected
    const selectedCategory = categoryFilter.value;
    if (selectedCategory) {
      loadProducts().then((products) => {
        const filteredProducts = products.filter(
          (product) => product.category === selectedCategory
        );
        displayProducts(filteredProducts);
      });
    }
  });
}

/* Filter and display products when category changes */
categoryFilter.addEventListener("change", async (e) => {
  currentCategory = e.target.value;
  displayProducts(getFilteredProducts());
});

// Search field event listener
const productSearch = document.getElementById("productSearch");
productSearch.addEventListener("input", (e) => {
  currentSearch = e.target.value;
  displayProducts(getFilteredProducts());
});

// Initial load from localStorage and update for selected products section

// Initial load from localStorage and update for selected products section
loadSelectedProducts();
updateSelectedProducts();

// Load all products once and display placeholder or filtered
loadProducts().then((products) => {
  allProducts = products;
  displayProducts(getFilteredProducts());
});

// Generate Routine button handler
const generateRoutineBtn = document.getElementById("generateRoutine");
generateRoutineBtn.addEventListener("click", async () => {
  if (selectedProducts.length === 0) {
    chatWindow.innerHTML = `<div class="placeholder-message">Select products to generate a routine.</div>`;
    return;
  }
  chatWindow.innerHTML = `<div class="placeholder-message">Generating your routine...</div>`;

  // Prepare messages for OpenAI API
  chatHistory = [
    {
      role: "system",
      content:
        "You are a helpful beauty advisor. Create a personalized routine using only the provided products. Respond in a friendly, clear way for beginners.",
    },
    {
      role: "user",
      content: `Here are my selected products: ${JSON.stringify(
        selectedProducts.map((p) => ({
          name: p.name,
          brand: p.brand,
          category: p.category,
          description: p.description,
        }))
      )}. Please generate a routine for me.`,
    },
  ];

  // Only send the last 6 messages for faster and safer routine generation
  const limitedHistory = chatHistory.slice(-6);
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: limitedHistory,
        max_tokens: 600,
      }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      chatWindow.innerHTML = `<div class='placeholder-message'>API Error: ${response.status} ${response.statusText}<br><span style='color:red;'>${errorText}</span></div>`;
      return;
    }
    const data = await response.json();
    const routine =
      data.choices &&
      data.choices[0] &&
      data.choices[0].message &&
      data.choices[0].message.content
        ? data.choices[0].message.content
        : null;
    if (routine) {
      chatWindow.innerHTML = `<div>${routine}</div>`;
      chatHistory.push({ role: "assistant", content: routine });
    } else {
      let errorMsg = "Sorry, I couldn't generate a routine. Please try again.";
      if (data.error && data.error.message) {
        errorMsg += `<br><span style='color:red;'>API Error: ${data.error.message}</span>`;
      }
      chatWindow.innerHTML = `<div class='placeholder-message'>${errorMsg}</div>`;
    }
  } catch (err) {
    chatWindow.innerHTML = `<div class='placeholder-message'>Error generating routine.<br><span style='color:red;'>${err.message}</span></div>`;
  }
});

// Chat form submission handler for follow-up questions
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const userInput = document.getElementById("userInput").value.trim();
  if (!userInput) return;

  // Add user message to chat history
  chatHistory.push({ role: "user", content: userInput });
  chatWindow.innerHTML = `<div class="placeholder-message">Thinking...</div>`;

  // Only send the last 6 messages for faster response
  const limitedHistory = chatHistory.slice(-6);
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: limitedHistory,
        max_tokens: 400,
      }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      chatWindow.innerHTML += `<div class='placeholder-message'>API Error: ${response.status} ${response.statusText}<br><span style='color:red;'>${errorText}</span></div>`;
      return;
    }
    const data = await response.json();
    const reply =
      data.choices &&
      data.choices[0] &&
      data.choices[0].message &&
      data.choices[0].message.content
        ? data.choices[0].message.content
        : "Sorry, I couldn't answer that. Please try again.";
    chatWindow.innerHTML += `<div><strong>You:</strong> ${userInput}</div><div><strong>Advisor:</strong> ${reply}</div>`;
    chatHistory.push({ role: "assistant", content: reply });
    document.getElementById("userInput").value = "";
  } catch (err) {
    chatWindow.innerHTML += `<div class='placeholder-message'>Error.<br><span style='color:red;'>${err.message}</span></div>`;
  }
});
