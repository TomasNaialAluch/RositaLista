// Modal de "Dividir en varios pedidos": reparte en kilos la cantidad de
// una línea ya agregada entre los tickets existentes y/o uno nuevo. Usa
// CartState para leer/escribir el estado — no lo toca directamente.

const SplitModal = (function () {
  const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

  /**
   * @param {string} sourceTicketId
   * @param {string} lineKey
   * @param {() => void} onDone - se llama después de aplicar (o cancelar) el reparto, para refrescar la UI
   */
  function open(sourceTicketId, lineKey, onDone) {
    const entry = CartState.getTicket(sourceTicketId).lines[lineKey];
    if (!entry) return;
    const totalKg = round2(CartState.kgOf(entry));
    const ticketOrder = CartState.getTicketOrder();

    const overlay = document.createElement("div");
    overlay.className = "cart-split-overlay";

    const rowsHtml = ticketOrder
      .map(
        (id) => `
        <div class="cart-split-row" data-ticket-id="${id}">
          <span class="cart-split-row-name">${CartState.getTicket(id).name}</span>
          <input type="number" class="cart-split-input" min="0" step="0.1" value="${id === sourceTicketId ? totalKg : 0}">
        </div>
      `
      )
      .join("");

    const modal = document.createElement("div");
    modal.className = "cart-split-modal";
    modal.innerHTML = `
      <p class="cart-split-title">Dividir "${CartState.lineName(entry)}"</p>
      <p class="cart-split-total">Total a repartir: ${totalKg} kg</p>
      <div class="cart-split-rows">${rowsHtml}</div>
      <button type="button" class="cart-split-add-new">+ Repartir a un pedido nuevo</button>
      <div class="cart-split-new-row hidden">
        <input type="text" class="cart-split-new-name" placeholder="Nombre del pedido nuevo">
        <input type="number" class="cart-split-input cart-split-new-kg" min="0" step="0.1" value="0">
      </div>
      <p class="cart-split-progress"></p>
      <div class="cart-split-actions">
        <button type="button" class="cart-split-cancel">Cancelar</button>
        <button type="button" class="cart-split-confirm" disabled>Confirmar</button>
      </div>
    `;

    const getInputs = () => [...modal.querySelectorAll(".cart-split-input")];
    const newRowEl = modal.querySelector(".cart-split-new-row");
    const addNewBtn = modal.querySelector(".cart-split-add-new");
    const progressEl = modal.querySelector(".cart-split-progress");
    const confirmBtn = modal.querySelector(".cart-split-confirm");

    function updateProgress() {
      const sum = round2(getInputs().reduce((s, i) => s + (parseFloat(i.value) || 0), 0));
      const ok = Math.abs(sum - totalKg) < 0.01;
      progressEl.textContent = `Repartido: ${sum} / ${totalKg} kg`;
      progressEl.classList.toggle("cart-split-progress--error", !ok);
      confirmBtn.disabled = !ok;
    }

    getInputs().forEach((input) => input.addEventListener("input", updateProgress));

    addNewBtn.addEventListener("click", () => {
      newRowEl.classList.remove("hidden");
      addNewBtn.classList.add("hidden");
      updateProgress();
    });

    modal.querySelector(".cart-split-cancel").addEventListener("click", () => overlay.remove());
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) overlay.remove();
    });

    confirmBtn.addEventListener("click", () => {
      const allocations = ticketOrder.map((id) => ({
        targetId: id,
        kg: parseFloat(modal.querySelector(`.cart-split-row[data-ticket-id="${id}"] .cart-split-input`).value) || 0,
      }));
      const newKg = parseFloat(modal.querySelector(".cart-split-new-kg").value) || 0;
      const newName = modal.querySelector(".cart-split-new-name").value.trim();

      CartState.applySplit(sourceTicketId, lineKey, allocations, newKg > 0 ? { name: newName, kg: newKg } : null);
      overlay.remove();
      onDone();
    });

    updateProgress();
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }

  return { open };
})();
