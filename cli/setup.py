from setuptools import setup, find_packages

setup(
    name="moonpkm",
    version="2.0.0",
    author="달의이성",
    description="Vim 기반 에이전틱 지식관리 시스템",
    packages=find_packages(),
    install_requires=[
        "click>=8.1",
        "rich>=13.0",
        "pyyaml>=6.0",
        "python-frontmatter>=1.1",
    ],
    extras_require={
        "ai": ["google-generativeai>=0.8"],
    },
    entry_points={
        "console_scripts": [
            "moonpkm=moon.cli:main",
            "mpkm=moon.cli:main",   # 짧은 별칭
        ],
    },
    python_requires=">=3.10",
    package_data={
        "moon": ["../agents/*.yaml", "../skills/*.yaml"],
    },
)
