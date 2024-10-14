# Formonit

Formonit gives you a free and easy, self-hosted form backend solution for adding (contact) forms to your static
website(s). You don't, however, need to configure any server or install anything. Your browser becomes your server!

Your smartphone or PC is perhaps always connected to the internet, even on the move. So, if you keep your browser open
there, and a very light-weight JavaScript server runs in it, you are essentially "self-hosting" for free. Formonit
capitalizes on this. Also, the ability to run in a browser makes Formonit platform-independent!

Working with Formonit is dead simple. All you need to do is the following:

- Create a Telegram Bot and store its API token. This is easy. Just open a chat with [@BotFather](https://t.me/botfather)
in Telegram and send: `/newbot`
- Follow instructions in the Config: section below. You will be required to choose a Form Action URL (API endpoint) there
- Use your chosen Form Action URL in your (contact) form

Whenever your users submit the form, you will get a Telegram text containing the users' form data from the Telegram Bot
you created.

Here is an HTML code snippet you can readily embed as a basic contact form in your website. Just replace `FormActionURL`
with the actual URL.

```html
<form accept-charset="UTF-8" action="FormActionURL" method="POST" enctype="text/plain">
    <input type="hidden" name="formID" value="sample">
    <input type="email" name="email" placeholder="Your Email">
    <input type="text" name="name" placeholder="Your Name">
    <input type="text" name="message" placeholder="Your Message">
    <input type="submit" value="Submit">
    <input type="reset" value="Reset">
</form>
```
