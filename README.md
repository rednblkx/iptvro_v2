# IPTV & VOD Media grabbing RO Providers

This project is written in TypeScript and runs on Deno. It allows you to access
romanian media providers with the provided credentials and provides stream URLs
for the available media.

## Prerequisites

Before running this project, you must have Deno installed. You can download it
[here](https://deno.land/#installation).

## Providers

| Name        | Authentication Required |
| ----------- | ----------------------- |
| Digi24      | No                      |
| Digi-Online | Yes                     |
| AntenaPlay  | Yes                     |
| Voyo        | Yes                     |
| Pro-Plus    | Yes                     |

## Usage

To use this project, run the following command:

`deno run --allow-read --allow-write --allow-env --allow-net src/index.ts`

A `configs` dir will then be created and inside it multiple .json files for each
module(provider) where you can input the appropriate credentials.

### Docker

Pull the image

`docker pull ghcr.io/redmusicxd/iptvro_v2:main`

Run it

`docker run -it --init -p 8090:3000 -v ./logs:/app/logs -v ./configs:/app/configs ghcr.io/redmusicxd/iptvro_v2:main`

As the image runs as non-root user (UID 1000, GID 1000), you need to make sure the `configs` and `logs` directories have the right permissions.

The following command should ensure they have the right permissions

`chown -R 1000:1000 configs; chown -R 1000:1000 logs`

## Permissions

Deno needs the following permissions to run this project:

- `--allow-read`: Allows the application to read files.
- `--allow-write`: Allows the application to write files.
- `--allow-env`: Allows the application to access environment variables.
- `--allow-net`: Allows the application to make network requests.

## Contributing

If you'd like to contribute to this project, please fork the repository and
create a pull request with your changes.

## License

This project is licensed under the MIT license. See the [LICENSE](LICENSE) file
for more details.
