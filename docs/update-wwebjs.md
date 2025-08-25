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

1. Run `npm run build` to look for new errors caused by the version update
1. If there are any errors, address them and try again
1. Optionally run the server with `npm run dev` and test it for functionality

## Commit your changes

1. After the version has been updated, commit your changes
    ```bash
    git add .
    git commit -m "Updated whatsapp-web.js"
    ```
1. [Create a new pull request](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request)
    - Request to pull changes from your branch into the main branch
1. Merge the pull request once all checks have succeeded


## Release a new version

1. Once the pull request has been merged, a docker image will be built automatically
1. The image can be found under the repos [GitHub packages](https://github.com/Rohde-Schwarz-Garage/sw-it-whatsappwebconnector/pkgs/container/whatsapp-web-connector)
1. Create a [new release in GitHub](https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository#creating-a-release), link to the correct package (`main`) and include what has changed. 
    - Take a look at the existing releases for inspiration

> [!NOTE]
> The latest version of the image can be pulled using `docker pull ghcr.io/rohde-schwarz-garage/whatsapp-web-connector:main`
