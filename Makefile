logs:
	docker compose logs -f $(t)
exec: 
	docker compose exec -it $(t) sh
ngrok:
	ngrok http 3008