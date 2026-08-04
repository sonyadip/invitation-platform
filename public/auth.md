# auth.md

Welcome agents! Senadda provides APIs for managing wedding invitations and RSVPs.

## Registration

To register an agent, visit our registration page at `https://senadda.id/agent/register` or follow the instructions in the OAuth authorization server metadata at `/.well-known/oauth-authorization-server`.

## Access

We support the following identity types for agents:
- `identity_assertion` (using `urn:ietf:params:oauth:token-type:id-jag` or `verified_email`)
- `anonymous`

Once authenticated, use the bearer token in the `Authorization` header when accessing `https://senadda.id/api`.
