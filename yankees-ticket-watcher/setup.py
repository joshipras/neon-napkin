from setuptools import find_packages, setup


setup(
    name="yankees-ticket-watcher",
    version="0.1.0",
    description="Personal Yankees premium ticket resale watcher.",
    long_description=open("README.md", encoding="utf-8").read(),
    long_description_content_type="text/markdown",
    python_requires=">=3.7",
    package_dir={"": "src"},
    packages=find_packages("src"),
    install_requires=[
        "httpx>=0.24,<0.25",
        "tenacity>=8.2,<9",
    ],
    extras_require={
        "dev": [
            "pytest>=7,<8",
        ],
    },
    entry_points={
        "console_scripts": [
            "yankees-watch=yankees_ticket_watcher.cli:main",
        ],
    },
)

