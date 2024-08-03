document.addEventListener('DOMContentLoaded', function() {
  if (!customElements.get('product-form')) {
    customElements.define('product-form', class ProductForm extends HTMLElement {
      constructor() {
        super();

        this.initVariantSwatches();
        this.form = this.querySelector('form');
        this.form.querySelector('[name=id]').disabled = false;
        this.form.addEventListener('submit', this.onSubmitHandler.bind(this));
        this.cart = document.querySelector('cart-notification') || document.querySelector('cart-drawer');
        this.submitButton = this.querySelector('[type="submit"]');
        if (document.querySelector('cart-drawer')) this.submitButton.setAttribute('aria-haspopup', 'dialog');
      }

      initVariantSwatches() {
        const swatches = document.querySelectorAll('.variant-swatch-input');
        if (swatches.length === 0) {
          console.error('No swatches found');
          return;
        }
        swatches.forEach(swatch => {
          this.updateSwatchImage(swatch);
          swatch.addEventListener('change', this.onVariantChange.bind(this));
        });
      }

      updateSwatchImage(swatch) {
        const variantImg = swatch.dataset.variantImg;
        const label = swatch.nextElementSibling;
        if (label && variantImg) {
          label.style.backgroundImage = `url(${variantImg})`;
        }
      }

      onVariantChange(event) {
        const variantId = event.target.value;
        const variantName = event.target.dataset.variantName;
        const optionPosition = event.target.dataset.optionPosition;
        this.updateVariantIdInput(variantId);
        this.updateGalleryImage(variantId);
        this.updateSelectedVariant(optionPosition, variantName);
      }

      updateVariantIdInput(variantId) {
        const variantInput = this.form.querySelector('input[name="id"]');
        variantInput.value = variantId;
      }

      updateGalleryImage(variantId) {
        const galleryImages = this.querySelectorAll('.gallery-image');
        galleryImages.forEach(img => {
          if (img.dataset.variantId === variantId) {
            img.classList.add('active');
          } else {
            img.classList.remove('active');
          }
        });
      }

      updateSelectedVariant(optionPosition, variantName) {
        const selectedVariantElement = document.querySelector(`#selected-variant-${optionPosition}`);
        console.log("selectedVariantElement:"+selectedVariantElement)
        if (selectedVariantElement) {
          selectedVariantElement.textContent = variantName;
        } else {
          console.error(`Element #selected-${selectedVariantElement} not found`);
        }
      }

      onSubmitHandler(evt) {
        evt.preventDefault();
        if (this.submitButton.getAttribute('aria-disabled') === 'true') return;

        this.handleErrorMessage();

        this.submitButton.setAttribute('aria-disabled', true);
        this.submitButton.classList.add('loading');
        this.querySelector('.loading-overlay__spinner').classList.remove('hidden');

        const config = fetchConfig('javascript');
        config.headers['X-Requested-With'] = 'XMLHttpRequest';
        delete config.headers['Content-Type'];

        const formData = new FormData(this.form);
        if (this.cart) {
          formData.append('sections', this.cart.getSectionsToRender().map((section) => section.id));
          formData.append('sections_url', window.location.pathname);
          this.cart.setActiveElement(document.activeElement);
        }
        config.body = formData;

        fetch(`${routes.cart_add_url}`, config)
          .then((response) => response.json())
          .then((response) => {
            if (response.status) {
              this.handleErrorMessage(response.description);

              const soldOutMessage = this.submitButton.querySelector('.sold-out-message');
              if (!soldOutMessage) return;
              this.submitButton.setAttribute('aria-disabled', true);
              this.submitButton.querySelector('span').classList.add('hidden');
              soldOutMessage.classList.remove('hidden');
              this.error = true;
              return;
            } else if (!this.cart) {
              window.location = window.routes.cart_url;
              return;
            }

            this.error = false;
            const quickAddModal = this.closest('quick-add-modal');
            if (quickAddModal) {
              document.body.addEventListener('modalClosed', () => {
                setTimeout(() => { this.cart.renderContents(response) });
              }, { once: true });
              quickAddModal.hide(true);
            } else {
              this.cart.renderContents(response);
            }
          })
          .catch((e) => {
            console.error(e);
          })
          .finally(() => {
            this.submitButton.classList.remove('loading');
            if (this.cart && this.cart.classList.contains('is-empty')) this.cart.classList.remove('is-empty');
            if (!this.error) this.submitButton.removeAttribute('aria-disabled');
            this.querySelector('.loading-overlay__spinner').classList.add('hidden');
          });
      }

      handleErrorMessage(errorMessage = false) {
        this.errorMessageWrapper = this.errorMessageWrapper || this.querySelector('.product-form__error-message-wrapper');
        if (!this.errorMessageWrapper) return;
        this.errorMessage = this.errorMessage || this.errorMessageWrapper.querySelector('.product-form__error-message');

        this.errorMessageWrapper.toggleAttribute('hidden', !errorMessage);

        if (errorMessage) {
          this.errorMessage.textContent = errorMessage;
        }
      }
    });
  }
});
