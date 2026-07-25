import { placeholderMessage } from "@/placeholder";

const app = document.querySelector<HTMLElement>("#app");

if (app === null) {
  throw new Error("Expected an element with id 'app' in index.html");
}

app.textContent = placeholderMessage();
