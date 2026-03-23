logs:
	docker compose logs -f $(T)
exec: 
	docker compose exec -it $(T) sh
ngrok:
	ngrok http 3008