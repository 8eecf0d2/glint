# Self-maintained tap preparation

Packaging renders `Casks/glint.rb.template` into the release's `glint.rb` using the immutable GitHub ZIP URL, actual digest and architecture restriction. The homepage is glint.broderickwilkinson.com. This is preparation, not an existing tap or official Homebrew cask.

After public downloads and license/installation acceptance, choose and create a public tap repository, copy the accepted generated file to `Casks/glint.rb`, review it and publish deliberately. Do not insert a guessed tap name into installation instructions. For each upgrade regenerate from that release, verify its URL/digest and review the cask diff before publishing.

On a clean Homebrew setup record the Homebrew version, explicit tap trust flow, install, upgrade from the prior version, app quit/replacement, Accessibility and login recovery, uninstall and optional zap. Do not remove quarantine or disable Gatekeeper. Official homebrew/cask submission is out of scope. Tap publication and these acceptance checks remain pending.
