// https://github.com/siyuan-note/siyuan/blob/171bfd62a70698879057742c2813f54f84164b66/app/src/menus/Menu.ts#L162
export class MenuItem {
    public element: HTMLElement;

    constructor(options: IMenu) {
        if (options.ignore) {
            return;
        }
        if (options.type === "empty") {
            this.element = document.createElement("div");
            this.element.innerHTML = options.label;
            if (options.bind) {
                options.bind(this.element);
            }
            return;
        }

        this.element = document.createElement("button");
        if (options.disabled) {
            this.element.setAttribute("disabled", "disabled");
        }
        if (options.id) {
            this.element.setAttribute("data-id", options.id);
        }
        if (options.type === "separator") {
            this.element.classList.add("b3-menu__separator");
            return;
        }
        this.element.classList.add("b3-menu__item");
        if (options.current) {
            this.element.classList.add("b3-menu__item--selected");
        }
        if (options.click) {
            // 需使用 click，否则移动端无法滚动
            this.element.addEventListener("click", (event) => {
                if (this.element.getAttribute("disabled")) {
                    return;
                }
                let keepOpen = options.click(this.element, event);
                if (keepOpen instanceof Promise) {
                    keepOpen = false;
                }
                event.preventDefault();
                event.stopImmediatePropagation();
                event.stopPropagation();
                if (this.element.parentElement && !keepOpen) {
                    window.siyuan.menus.menu.remove();
                }
            });
        }
        if (options.type === "readonly") {
            this.element.classList.add("b3-menu__item--readonly");
        }
        if (options.icon === "iconTrashcan" || options.warning) {
            this.element.classList.add("b3-menu__item--warning");
        }

        if (options.element) {
            this.element.append(options.element);
        } else {
            let html = `<span class="b3-menu__label">${options.label || "&nbsp;"}</span>`;
            if (typeof options.iconHTML === "string") {
                html = options.iconHTML + html;
            } else {
                html = `<svg class="b3-menu__icon ${options.iconClass || ""}" style="${options.icon === "iconClose" ? "height:10px;" : ""}"><use xlink:href="#${options.icon || ""}"></use></svg>${html}`;
            }
            if (options.accelerator) {
                html += `<span class="b3-menu__accelerator">${options.accelerator}</span>`;
            }
            if (options.action) {
                html += `<svg class="b3-menu__action${options.action === "iconCloseRound" ? " b3-menu__action--close" : ""}"><use xlink:href="#${options.action}"></use></svg>`;
            }
            if (options.checked) {
                html += '<svg class="b3-menu__checked"><use xlink:href="#iconSelect"></use></svg></span>';
            }
            this.element.innerHTML = html;
        }

        if (options.bind) {
            // 主题 rem craft 需要使用 b3-menu__item--custom 来区分自定义菜单 by 281261361
            this.element.classList.add("b3-menu__item--custom");
            options.bind(this.element);
        }

        if (options.submenu) {
            const submenuElement = document.createElement("div");
            submenuElement.classList.add("b3-menu__submenu");
            submenuElement.innerHTML = '<div class="b3-menu__items"></div>';
            options.submenu.forEach((item) => {
                submenuElement.firstElementChild.append(new MenuItem(item).element);
            });
            this.element.insertAdjacentHTML("beforeend", '<svg class="b3-menu__icon b3-menu__icon--small"><use xlink:href="#iconRight"></use></svg>');
            this.element.append(submenuElement);
        }
    }
}