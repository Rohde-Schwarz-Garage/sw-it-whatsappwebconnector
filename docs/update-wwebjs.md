# Updating the WhatsAppWeb.js library

Since *WhatsApp* regularly updates their service and the **whatsapp-web.js** library needs to be able to handle these (sometimes breaking) changes, it frequently receives updates. Thus the code of the whatsapp-server constantly needs to update the library to keep up with those changes or it **will** break.

This guide outlines the full process of updating the library and releasing a new container version.

## Branch setup

1. [Create a new branch on GitHub](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-and-deleting-branches-within-your-repository)
1. [Clone the git repository locally](https://docs.github.com/en/repositories/creating-and-managing-repositories/cloning-a-repository) or run `git fetch` if already cloned
1. Switch to your branch
    ```bash
    git checkout <your-branch-name>
    ```
1. If desired, update your git name and e-mail to your GitHub name and e-mail
    ```bash
    git config --local user.name "Your GitHub Username"
    git config --local user.email "Your GitHub E-Mail"
    ```

> [!NOTE]
> The `git` commands need to be run inside your local repository folder

## Update the library

1. Open the `whatsapp-server` folder
1. Run `npm i` to install all required dependencies locally
1. Run `npm i whatsapp-web.js@latest` to update the whatsapp-web library to the latest version

## Test your changes

## Commit your changes

## Release a new version

