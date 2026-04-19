# Ansible

Playbooks for the phase 3 load-testing VM.

## Files
- `site.yml`: installs Python, pip, Locust and helper tools on the testing VM.
- `inventory.example.ini`: sample inventory for the load-testing host.

## Run
```bash
ansible-playbook -i inventory.example.ini site.yml
```
