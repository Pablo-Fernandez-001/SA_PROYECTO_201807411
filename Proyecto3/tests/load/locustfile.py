from locust import HttpUser, task, between


class DeliverEatsUser(HttpUser):
    wait_time = between(1, 3)

    @task(3)
    def health(self):
        self.client.get("/health")

    @task(2)
    def restaurants(self):
        self.client.get("/api/catalog/restaurants")

    @task(1)
    def orders(self):
        self.client.get("/api/orders")
